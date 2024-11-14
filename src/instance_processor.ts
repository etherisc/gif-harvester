import { PrismaClient } from "@prisma/client";
import { Instance } from "./types/instance";
import { DecodedLogEntry } from "./types/logdata";
import { logger } from "./logger";
import { IInstanceService__factory } from "./generated/contracts/gif";

export default class InstanceProcessor {
    private prisma: PrismaClient;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
    }
    
    async persistInstances(instances: Instance[]): Promise<void> {
        for (const instance of instances) {
            await this.prisma.instance.upsert({
                where: { nftId: instance.nftId as bigint },
                update: {
                    instanceAddress: instance.instanceAddress,
                    modified_blockNumber: instance.modified.blockNumber,
                    modified_txHash: instance.modified.txHash,
                    modified_from: instance.modified.from
                },
                create: {
                    nftId: instance.nftId as bigint,
                    instanceAddress: instance.instanceAddress,
                    created_blockNumber: instance.created.blockNumber,
                    created_txHash: instance.created.txHash,
                    created_from: instance.created.from,
                    modified_blockNumber: instance.modified.blockNumber,
                    modified_txHash: instance.modified.txHash,
                    modified_from: instance.modified.from
                }
            });
        }
    }

    async processInstanceServiceEvents(instanceEvents: Array<DecodedLogEntry>): Promise<Array<Instance>> {
        return instanceEvents.map(event => {
            logger.info(`Processing instance service event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
            const data = this.decodeIInstanceServiceEvent(event);
            if (data === null || data === undefined) {
                logger.error(`Failed to decode event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
                return null as unknown as Instance;
            }
            if (data.name !== 'LogInstanceServiceInstanceCreated') {
                return null as unknown as Instance;
            }

            logger.debug(`args: ${JSON.stringify(data.args)}`);
            const nftId = data.args[0] as BigInt;
            const instanceAddress = data.args[1] as string;
            return {
                nftId,
                instanceAddress,
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
            } as Instance;
        }).filter(event => event !== null);
    }

    

    decodeIInstanceServiceEvent(event: DecodedLogEntry) {
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
        return IInstanceService__factory.createInterface().parseLog({ topics: [topic0, topic1, topic2, topic3], data: event.data });
    }

}