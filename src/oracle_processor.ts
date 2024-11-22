import { PrismaClient } from "@prisma/client";
import { Instance } from "./types/instance";
import { DecodedLogEntry } from "./types/logdata";
import { logger } from "./logger";
import { IInstanceService__factory, IOracleService__factory } from "./generated/contracts/gif";
import { OracleRequest, OracleRequestState } from "./types/oracle_request";

export default class OracleProcessor {
    private prisma: PrismaClient;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
    }
    
    async persistOracleRequests(requests: OracleRequest[]): Promise<void> {
        for (const request of requests) {
            await this.prisma.oracleRequest.upsert({
                where: { requestId: request.requestId as bigint },
                update: {
                    oracleNftId: request.oracleNftId as bigint,
                    requesterNftId: request.requesterNftId as bigint,
                    expirationAt: request.expirationAt as bigint,
                    state: request.state,
                    objectAddress: request.objectAddress,
                    functionSignature: request.functionSignature,
                    modified_blockNumber: request.modified.blockNumber,
                    modified_timestamp: request.modified.timestamp as bigint,
                    modified_txHash: request.modified.txHash,
                    modified_from: request.modified.from
                },
                create: {
                    requestId: request.requestId as bigint,
                    oracleNftId: request.oracleNftId as bigint,
                    requesterNftId: request.requesterNftId as bigint,
                    expirationAt: request.expirationAt as bigint,
                    state: request.state,
                    objectAddress: request.objectAddress,
                    functionSignature: request.functionSignature,
                    created_blockNumber: request.created.blockNumber,
                    created_timestamp: request.created.timestamp as bigint,
                    created_txHash: request.created.txHash,
                    created_from: request.created.from,
                    modified_blockNumber: request.modified.blockNumber,
                    modified_timestamp: request.modified.timestamp as bigint,
                    modified_txHash: request.modified.txHash,
                    modified_from: request.modified.from
                }
            });
        }
    }
    

    async processOracleRequestCreatedEvent(event: DecodedLogEntry, requests: Map<BigInt, OracleRequest>): Promise<Map<BigInt, OracleRequest>> {
        if (event.event_name !== 'LogOracleServiceRequestCreated') {
            throw new Error(`Invalid event type ${event.event_name}`);
        }

        logger.debug(`Processing oracle request created event`);

        const data = this.decodeIOracleServiceEvent(event);
        if (data === null || data === undefined) {
            logger.error(`Failed to decode event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
            return requests;
        }
        if (data.name !== 'LogOracleServiceRequestCreated') {
            throw new Error(`Invalid event name ${data.name}`);
        }

        logger.debug(`args: ${JSON.stringify(data.args)}`);
        const requestId = data.args[0] as bigint;
        const requesterNftId = data.args[1] as bigint;
        const oracleNftId = data.args[2] as bigint;
        const expirationAt = data.args[3] as bigint;
        const instance = {
            oracleNftId,
            requesterNftId,
            requestId,
            expirationAt,
            state: OracleRequestState.PENDING,
            created: {
                blockNumber: event.block_number,
                timestamp: BigInt(new Date(event.block_time).getTime()),
                txHash: event.tx_hash,
                from: event.tx_from
            },
            modified: {
                blockNumber: event.block_number,
                timestamp: BigInt(new Date(event.block_time).getTime()),
                txHash: event.tx_hash,
                from: event.tx_from
            }
        } as OracleRequest;
        requests.set(requestId, instance);
        return requests;
    }

    async processOracleResponseProcessedEvent(event: DecodedLogEntry, requests: Map<BigInt, OracleRequest>): Promise<Map<BigInt, OracleRequest>> {
        if (event.event_name !== 'LogOracleServiceResponseProcessed') {
            throw new Error(`Invalid event type ${event.event_name}`);
        }

        logger.debug(`Processing oracle response processed event`);

        const data = this.decodeIOracleServiceEvent(event);
        if (data === null || data === undefined) {
            logger.error(`Failed to decode event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
            return requests;
        }
        if (data.name !== 'LogOracleServiceResponseProcessed') {
            throw new Error(`Invalid event name ${data.name}`);
        }

        logger.debug(`args: ${JSON.stringify(data.args)}`);
        const requestId = data.args[0] as bigint;
        const oracleNftId = data.args[1] as bigint;
        
        const request = requests.get(requestId);
        if (request === undefined) {
            logger.error(`Failed to find request ${requestId}`);
            return requests;
        }
        request.state = OracleRequestState.FULFILLED;
        request.modified = {
            blockNumber: event.block_number,
            timestamp: BigInt(new Date(event.block_time).getTime()),
            txHash: event.tx_hash,
            from: event.tx_from
        };
        return requests;
    }

    async processOracleDeliveryFailedEvent(event: DecodedLogEntry, requests: Map<BigInt, OracleRequest>): Promise<Map<BigInt, OracleRequest>> {
        if (event.event_name !== 'LogOracleServiceDeliveryFailed') {
            throw new Error(`Invalid event type ${event.event_name}`);
        }

        logger.debug(`Processing oracle delivery failed event`);

        const data = this.decodeIOracleServiceEvent(event);
        if (data === null || data === undefined) {
            logger.error(`Failed to decode event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
            return requests;
        }
        if (data.name !== 'LogOracleServiceDeliveryFailed') {
            throw new Error(`Invalid event name ${data.name}`);
        }

        logger.debug(`args: ${JSON.stringify(data.args)}`);
        const requestId = data.args[0] as bigint;
        const objectAddress = data.args[1] as string;
        const functionSignature = data.args[2] as string;
        
        const request = requests.get(requestId);
        if (request === undefined) {
            logger.error(`Failed to find request ${requestId}`);
            return requests;
        }
        request.state = OracleRequestState.DELIVERY_FAILED;
        request.objectAddress = objectAddress;
        request.functionSignature = functionSignature;
        request.modified = {
            blockNumber: event.block_number,
            timestamp: BigInt(new Date(event.block_time).getTime()),
            txHash: event.tx_hash,
            from: event.tx_from
        };
        return requests;
    }

    async processOracleResponseResentEvent(event: DecodedLogEntry, requests: Map<BigInt, OracleRequest>): Promise<Map<BigInt, OracleRequest>> {
        if (event.event_name !== 'LogOracleServiceResponseResent') {
            throw new Error(`Invalid event type ${event.event_name}`);
        }

        logger.debug(`Processing oracle response resent event`);

        const data = this.decodeIOracleServiceEvent(event);
        if (data === null || data === undefined) {
            logger.error(`Failed to decode event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
            return requests;
        }
        if (data.name !== 'LogOracleServiceResponseResent') {
            throw new Error(`Invalid event name ${data.name}`);
        }

        logger.debug(`args: ${JSON.stringify(data.args)}`);
        const requestId = data.args[0] as bigint;
        
        const request = requests.get(requestId);
        if (request === undefined) {
            logger.error(`Failed to find request ${requestId}`);
            return requests;
        }
        request.state = OracleRequestState.RESENT;
        request.modified = {
            blockNumber: event.block_number,
            timestamp: BigInt(new Date(event.block_time).getTime()),
            txHash: event.tx_hash,
            from: event.tx_from
        };
        return requests;
    }

    async processOracleRequestCancelledEvent(event: DecodedLogEntry, requests: Map<BigInt, OracleRequest>): Promise<Map<BigInt, OracleRequest>> {
        if (event.event_name !== 'LogOracleServiceRequestCancelled') {
            throw new Error(`Invalid event type ${event.event_name}`);
        }

        logger.debug(`Processing oracle request cancelled event`);

        const data = this.decodeIOracleServiceEvent(event);
        if (data === null || data === undefined) {
            logger.error(`Failed to decode event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
            return requests;
        }
        if (data.name !== 'LogOracleServiceRequestCancelled') {
            throw new Error(`Invalid event name ${data.name}`);
        }

        logger.debug(`args: ${JSON.stringify(data.args)}`);
        const requestId = data.args[0] as bigint;
        
        const request = requests.get(requestId);
        if (request === undefined) {
            logger.error(`Failed to find request ${requestId}`);
            return requests;
        }
        request.state = OracleRequestState.CANCELLED;
        request.modified = {
            blockNumber: event.block_number,
            timestamp: BigInt(new Date(event.block_time).getTime()),
            txHash: event.tx_hash,
            from: event.tx_from
        };
        return requests;
    }

    decodeIOracleServiceEvent(event: DecodedLogEntry) {
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
        return IOracleService__factory.createInterface().parseLog({ topics: [topic0, topic1, topic2, topic3], data: event.data });
    }

}