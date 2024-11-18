import { PrismaClient } from "@prisma/client";
import { getObjectType, ObjectType } from "./types/objecttype";
import { logger } from "./logger";
import { IApplicationService__factory, IPolicyService__factory, IRegistry__factory } from "./generated/contracts/gif";
import { DecodedLogEntry } from "./types/logdata";
import { Nft } from "./types/nft";
import { log } from "console";
import { Policy } from "./types/policy";

export default class PolicyProcessor {
    private prisma: PrismaClient;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
    }

    async persistPolicies(policies: Policy[]): Promise<void> {
        for (const policy of policies) {
            await this.prisma.policy.upsert({
                where: { nftId: policy.nftId as bigint },
                update: {
                    productNftId: policy.productNftId as bigint,
                    bundleNftId: policy.bundleNftId as bigint,
                    riskId: policy.riskId,
                    referralId: policy.referralId ?? '',
                    sumInsuredAmount: policy.sumInsuredAmount as bigint,
                    premiumAmount: policy.premiumAmount as bigint,
                    premiumPaid: policy.premiumPaid as bigint,
                    lifetime: policy.lifetime as bigint,
                    activateAt: (policy.activateAt ?? BigInt(-1)) as bigint,
                    expirationAt: (policy.expirationAt as bigint) ?? null,
                    closed: policy.closed,
                    modified_blockNumber: policy.modified.blockNumber,
                    modified_txHash: policy.modified.txHash,
                    modified_from: policy.modified.from
                },
                create: {
                    nftId: policy.nftId as bigint,
                    productNftId: policy.productNftId as bigint,
                    bundleNftId: policy.bundleNftId as bigint,
                    riskId: policy.riskId,
                    referralId: policy.referralId ?? '',
                    sumInsuredAmount: policy.sumInsuredAmount as bigint,
                    premiumAmount: policy.premiumAmount as bigint,
                    premiumPaid: policy.premiumPaid as bigint,
                    lifetime: policy.lifetime as bigint,
                    activateAt: (policy.activateAt ?? BigInt(-1)) as bigint,
                    expirationAt: (policy.expirationAt as bigint) ?? null,
                    closed: policy.closed,
                    created_blockNumber: policy.created.blockNumber,
                    created_timestamp: policy.created.timestamp as bigint,
                    created_txHash: policy.created.txHash,
                    created_from: policy.created.from,
                    modified_blockNumber: policy.modified.blockNumber,
                    modified_timestamp: policy.modified.timestamp as bigint,
                    modified_txHash: policy.modified.txHash,
                    modified_from: policy.modified.from
                }
            });
        }
    }

    async processApplicationCreatedEvent(event: DecodedLogEntry, policies: Map<BigInt, Policy>): Promise<Map<BigInt, Policy>> {
        if (event.event_name !== 'LogApplicationServiceApplicationCreated') {
            throw new Error(`Invalid event type ${event.event_name}`);
        }

        logger.debug(`Processing application created event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
        const data = this.decodeApplicationServiceEvent(event);
        if (data === null || data === undefined) {
            logger.error(`Failed to decode event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
            return policies;
        }
        if (data.name !== 'LogApplicationServiceApplicationCreated') {
            throw new Error(`Invalid event name ${data.name}`);
        }

        const nftId = data.args[0] as BigInt;
        const productNftId = data.args[1] as BigInt;
        const bundleNftId = data.args[2] as BigInt;
        const riskId = data.args[3] as string;
        const referralId = data.args[4] as string;
        const sumInsuredAmount = data.args[6] as BigInt;
        const premiumAmount = data.args[7] as BigInt;
        const lifetime = data.args[8] as BigInt;
        
        const policy = {
            nftId,
            productNftId,
            bundleNftId,
            riskId,
            referralId,
            sumInsuredAmount,
            premiumAmount,
            premiumPaid: BigInt(0),
            lifetime,
            activateAt: null,
            expirationAt: null,
            closed: false,
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
        };
        policies.set(nftId, policy);

        logger.info(`ApplicationCreated event: ${policy.nftId} - ${policy.riskId} - ${policy.sumInsuredAmount} - ${policy.premiumAmount} - ${policy.lifetime}`);

        return policies;
    }

    async processPolicyCreatedEvent(event: DecodedLogEntry, policies: Map<BigInt, Policy>): Promise<Map<BigInt, Policy>> {
        if (event.event_name !== 'LogPolicyServicePolicyCreated') {
            throw new Error(`Invalid event type ${event.event_name}`);
        }

        logger.debug(`Processing policy created event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
        const data = this.decodePolicyServiceEvent(event);
        if (data === null || data === undefined) {
            logger.error(`Failed to decode event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
            return policies;
        }
        if (data.name !== 'LogPolicyServicePolicyCreated') {
            throw new Error(`Invalid event name ${data.name}`);
        }

        const nftId = data.args[0] as BigInt;
        const premiumAmount = data.args[1] as BigInt;
        const activateAt = data.args[2] as BigInt;
        
        const policy = policies.get(nftId);

        if (policy === undefined) {
            logger.error(`Policy not found for nftId ${nftId}`);
            return policies;
        }

        policy.premiumAmount = premiumAmount;
        policy.activateAt = activateAt;
        policy.modified = {
            blockNumber: event.block_number,
            timestamp: BigInt(new Date(event.block_time).getTime()),
            txHash: event.tx_hash,
            from: event.tx_from
        };

        logger.info(`PolicyCreated event: ${policy.nftId} - ${policy.premiumAmount} - ${policy.activateAt}`);

        return policies;
    }

    async processPolicyPremiumCollectedEvent(event: DecodedLogEntry, policies: Map<BigInt, Policy>): Promise<Map<BigInt, Policy>> {
        if (event.event_name !== 'LogPolicyServicePolicyPremiumCollected') {
            throw new Error(`Invalid event type ${event.event_name}`);
        }

        logger.debug(`Processing policy created event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
        const data = this.decodePolicyServiceEvent(event);
        if (data === null || data === undefined) {
            logger.error(`Failed to decode event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
            return policies;
        }
        if (data.name !== 'LogPolicyServicePolicyPremiumCollected') {
            throw new Error(`Invalid event name ${data.name}`);
        }

        const nftId = data.args[0] as BigInt;
        const premiumPaid = data.args[1] as BigInt;
        
        const policy = policies.get(nftId);

        if (policy === undefined) {
            logger.error(`Policy not found for nftId ${nftId}`);
            return policies;
        }

        policy.premiumPaid = premiumPaid;
        policy.modified = {
            blockNumber: event.block_number,
            timestamp: BigInt(new Date(event.block_time).getTime()),
            txHash: event.tx_hash,
            from: event.tx_from
        };

        logger.info(`PolicyPremiumCollected event: ${policy.nftId} - ${policy.premiumPaid}`);

        return policies;
    }

    async processPolicyExpirationUpdatedEvent(event: DecodedLogEntry, policies: Map<BigInt, Policy>): Promise<Map<BigInt, Policy>> {
        if (event.event_name !== 'LogPolicyServicePolicyExpirationUpdated') {
            throw new Error(`Invalid event type ${event.event_name}`);
        }

        logger.debug(`Processing policy expiration updated event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
        const data = this.decodePolicyServiceEvent(event);
        if (data === null || data === undefined) {
            logger.error(`Failed to decode event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
            return policies;
        }
        if (data.name !== 'LogPolicyServicePolicyExpirationUpdated') {
            throw new Error(`Invalid event name ${data.name}`);
        }

        const nftId = data.args[0] as BigInt;
        const expirationAt = data.args[1] as BigInt;
        
        const policy = policies.get(nftId);

        if (policy === undefined) {
            logger.error(`Policy not found for nftId ${nftId}`);
            return policies;
        }

        policy.expirationAt = expirationAt;
        policy.modified = {
            blockNumber: event.block_number,
            timestamp: BigInt(new Date(event.block_time).getTime()),
            txHash: event.tx_hash,
            from: event.tx_from
        };

        logger.info(`PolicyExpirationUpdated event: ${policy.nftId} - ${policy.activateAt}`);

        return policies;
    }

    async processPolicyClosedEvent(event: DecodedLogEntry, policies: Map<BigInt, Policy>): Promise<Map<BigInt, Policy>> {
        if (event.event_name !== 'LogPolicyServicePolicyClosed') {
            throw new Error(`Invalid event type ${event.event_name}`);
        }

        logger.debug(`Processing policy closed event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
        const data = this.decodePolicyServiceEvent(event);
        if (data === null || data === undefined) {
            logger.error(`Failed to decode event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
            return policies;
        }
        if (data.name !== 'LogPolicyServicePolicyClosed') {
            throw new Error(`Invalid event name ${data.name}`);
        }

        const nftId = data.args[0] as BigInt;
        
        const policy = policies.get(nftId);

        if (policy === undefined) {
            logger.error(`Policy not found for nftId ${nftId}`);
            return policies;
        }
        
        policy.closed = true;
        policy.modified = {
            blockNumber: event.block_number,
            timestamp: BigInt(new Date(event.block_time).getTime()),
            txHash: event.tx_hash,
            from: event.tx_from
        };

        logger.info(`PolicyClosed event: ${policy.nftId}`);

        return policies;
    }

    decodeApplicationServiceEvent(event: DecodedLogEntry) {
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
        return IApplicationService__factory.createInterface().parseLog({ topics: [topic0, topic1, topic2, topic3], data: event.data });
    }

    decodePolicyServiceEvent(event: DecodedLogEntry) {
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
        return IPolicyService__factory.createInterface().parseLog({ topics: [topic0, topic1, topic2, topic3], data: event.data });
    }
}