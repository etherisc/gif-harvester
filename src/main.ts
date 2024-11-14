import axios from 'axios';
import * as dotenv from 'dotenv';
import { DUNE_API_BASE_URL, DUNE_API_KEY, DUNE_QUERY_ID_NFT_REGISTRATION_EVENTS, DUNE_QUERY_ID_NFT_TRANSFER_EVENTS } from './constants';
import { IRegistry__factory } from './generated/contracts/gif';
import { logger } from './logger';
import { DecodedLogEntry } from './types/logdata';
import { Nft } from './types/nft';
import { getObjectType, ObjectType } from './types/objecttype';
import { notStrictEqual } from 'assert';
import { PrismaClient } from '@prisma/client';

dotenv.config();

// @ts-expect-error BigInt is not defined in the global scope
BigInt.prototype.toJSON = function () {
    const int = Number.parseInt(this.toString());
    return int ?? this.toString();
};

class Main {

    private prisma: PrismaClient;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
    }

    public async main(): Promise<void> {
        await this.fetchLatestBlock();        
    }

    async fetchLatestBlock() {
        logger.info('Fetching latest block');
        // const latestBlockDataRows = await this.executeDuneQueryAndGetResult(DUNE_QUERY_ID_BASE_LATEST_BLOCK);
        const nftRegistrationEvents = await this.getLatestResult(DUNE_QUERY_ID_NFT_REGISTRATION_EVENTS, 0);
        const nftTransferEvents = await this.getLatestResult(DUNE_QUERY_ID_NFT_TRANSFER_EVENTS, 0);

        let nfts = await this.processNftRegistrationEvents(nftRegistrationEvents);
        nfts = await this.processNftTransferEvents(nftTransferEvents, nfts);
        await this.persistNfts(nfts);
        
        // print one log per event
        nfts.forEach(event => {
            logger.info(`NFT: ${event.nftId} - ${ObjectType[event.objectType]} - ${event.objectAddress} - ${event.owner}`);
        });


        // const latestBaseBlock = latestBlockDataRows[0]._col0;

        // logger.info(`Latest block: ${latestBaseBlock}`);
    }

    async persistNfts(nfts: Nft[]): Promise<void> {
        for (const nft of nfts) {
            await this.prisma.nft.upsert({
                where: { nftId: nft.nftId as bigint },
                update: {
                    parentNftId: nft.parentNftId as bigint,
                    objectType: ObjectType[nft.objectType],
                    objectAddress: nft.objectAddress,
                    owner: nft.owner,
                    modified_blockNumber: nft.modified.blockNumber,
                    modified_txHash: nft.modified.txHash,
                    modified_from: nft.modified.from
                },
                create: {
                    nftId: nft.nftId as bigint,
                    parentNftId: nft.parentNftId as bigint,
                    objectType: ObjectType[nft.objectType],
                    objectAddress: nft.objectAddress,
                    owner: nft.owner,
                    created_blockNumber: nft.created.blockNumber,
                    created_txHash: nft.created.txHash,
                    created_from: nft.created.from,
                    modified_blockNumber: nft.modified.blockNumber,
                    modified_txHash: nft.modified.txHash,
                    modified_from: nft.modified.from
                }
            });
        }
    }

    async processNftRegistrationEvents(nftRegistrationEvents: Array<DecodedLogEntry>): Promise<Array<Nft>> {
        return nftRegistrationEvents.map(event => {
            logger.info(`Processing nft registration event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
            const data = this.decodeLogRegistryObjectRegisteredEvent(event);
            if (data === null || data === undefined) {
                logger.error(`Failed to decode event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
                return null as unknown as Nft;
            }
            const nftId = data.args[0] as BigInt;
            const parentNftId = data.args[1] as BigInt;
            const objectType = getObjectType(BigInt(data.args[2]));
            const objectAddress = data.args[4] as string;
            const owner = data.args[5] as string;
            return {
                nftId,
                parentNftId,
                objectType: objectType,
                objectAddress: objectAddress,
                owner: owner,
                created: {
                    blockNumber: event.block_number,
                    txHash: event.tx_hash,
                    from: event.tx_from
                },
                modified: {
                    blockNumber: event.block_number,
                    txHash: event.tx_hash,
                    from: event.tx_from
                }
            } as Nft;
        }).filter(event => event !== null);
    }

    async processNftTransferEvents(nftTransferEvents: Array<DecodedLogEntry>, nfts: Array<Nft>): Promise<Array<Nft>> {
        nftTransferEvents.forEach(event => {
            logger.debug(`Processing nft transfer event ${event.tx_hash} - ${event.event_name} - ${event.topic0} - ${event.topic1} - ${event.topic2} - ${event.topic3} - ${event.data}`);
            // extract addresses
            const from = `0x${event.topic1.substring(26)}`;
            const to = `0x${event.topic2.substring(26)}`;
            const nftId = BigInt(event.topic3);
            // logger.debug(`Transfer from ${from} to ${to} for NFT ${nftId}`);

            if (from === '0x0000000000000000000000000000000000000000') {
                return;
            }

            const nft = nfts.find(nft => nft.nftId === nftId);
            if (nft === undefined) {
                logger.error(`NFT ${nftId} not found`);
                return;
            }
            nft.owner = to;
            nft.modified = {
                blockNumber: event.block_number,
                txHash: event.tx_hash,
                from: event.tx_from
            };
            logger.debug(`Transfer NFT ${nftId} from ${from} to ${to}`);
        });
        return nfts;
    }

    decodeLogRegistryObjectRegisteredEvent(event: DecodedLogEntry) {
        const topic0 = event.topic0;
        let topic1 = event.topic1;
        if (topic1 === null || topic1 === undefined || topic1 === '') {
            topic1 = '0x';
        }
        let topic2 = event.topic2;
        if (topic2 === null || topic2 === undefined || topic2 === '') {
            topic2 = '0x';
        }
        let topic3 = event.topic3;
        if (topic3 === null || topic3 === undefined || topic3 === '') {
            topic3 = '0x';
        }
        return IRegistry__factory.createInterface().parseLog({ topics: [topic0, topic1, topic2, topic3], data: event.data });
    }

    async executeDuneQueryAndGetResult(queryId: string, blocknumber?: number): Promise<any> {
        logger.info('Executing query ' + queryId);
        logger.debug('trigger execution')
        const executeQueryUrl = `${DUNE_API_BASE_URL}/v1/query/${queryId}/execute`;
        let body = { "performance": "medium", "query_parameters": {} };
        if (blocknumber) {
            body = {
                "performance": "medium",
                "query_parameters": {"blocknumber": blocknumber}
            };
        }
        const executeQueryUrlResponse = await axios.post(executeQueryUrl, body, 
        {
            headers: {
                'x-dune-api-key': DUNE_API_KEY
            }
        });
        const executionId = executeQueryUrlResponse.data.execution_id;
        logger.info(`Execution ID: ${executionId}`);

        // poll state until execution is done
        const executeStatusUrl = `${DUNE_API_BASE_URL}/v1/execution/${executionId}/status`;
        let state = 'QUERY_STATE_PENDING';
        let totalRowCount = 0;
        while (state === 'QUERY_STATE_PENDING' || state === 'QUERY_STATE_EXECUTING') {
            const executeStatusUrlResponse = await axios.get(executeStatusUrl, {
                headers: {
                    'x-dune-api-key': DUNE_API_KEY
                }
            });
            state = executeStatusUrlResponse.data.state;
            logger.debug(executeStatusUrlResponse.data);
            totalRowCount = executeStatusUrlResponse.data?.result_metadata?.total_row_count;
            logger.debug(`Status: ${state} - ${totalRowCount} rows`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        logger.info(`Execution finished - fetching results`);

        const url = `${DUNE_API_BASE_URL}/v1/execution/${executionId}/results`;
        const rows = [];
        const limit = 1000;
        let offset = 0;
        logger.debug(`Fetching results for execution ${executionId}`);
        while (offset * limit < totalRowCount) {
            // fetch results in chunks
            logger.debug(`Fetching results offset ${offset} limit ${limit}`);
            const response = await axios.get(`${url}?limit=${limit}&offset=${offset}`, {
                headers: {
                    'x-dune-api-key': DUNE_API_KEY
                }
            });
            rows.push(...response.data.result.rows);
            offset += limit;
        }

        logger.info(`Fetched ${rows.length} rows`);

        return rows;
    }


    async getLatestResult(queryId: string, blocknumber?: number): Promise<any> {
        logger.info('Getting latest result for query ' + queryId);

        const url = `${DUNE_API_BASE_URL}/v1/query/${queryId}/results`;
        const rows = [];
        const limit = 1000;
        let offset = 0;
        let totalRowCount = 0;
        do {
            // fetch results in chunks
            logger.debug(`Fetching results offset ${offset} limit ${limit}`);
            const response = await axios.get(`${url}?limit=${limit}&offset=${offset}`, {
                headers: {
                    'x-dune-api-key': DUNE_API_KEY
                }
            });
            console.log(response.data);
            if (totalRowCount === 0) {
                totalRowCount = response.data.result.metadata.total_row_count;
            }
            rows.push(...response.data.result.rows);
            offset += limit;
        } while (totalRowCount > 0 && offset * limit < totalRowCount)

        logger.info(`Fetched ${rows.length} rows`);

        return rows;
    }

}

const prisma = new PrismaClient()
try {
    new Main(prisma).main();
} finally {
    prisma.$disconnect();
}
