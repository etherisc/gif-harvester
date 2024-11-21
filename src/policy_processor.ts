import { PrismaClient } from "@prisma/client";
import { getObjectType, ObjectType } from "./types/objecttype";
import { logger } from "./logger";
import { IApplicationService__factory, IClaimService__factory, IPolicyService__factory, IRegistry__factory } from "./generated/contracts/gif";
import { DecodedLogEntry } from "./types/logdata";
import { Nft } from "./types/nft";
import { log } from "console";
import { Policy } from "./types/policy";
import { Claim, ClaimState } from "./types/claim";
import { Payout } from "./types/payout";

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
                    modified_timestamp: policy.modified.timestamp as bigint,
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

    async persistClaims(claims: Claim[]): Promise<void> {
        for (const claim of claims) {
            await this.prisma.claim.upsert({
                where: { policyNftId_claimId: { policyNftId: claim.policyNftId as bigint, claimId: claim.claimId as bigint } },
                update: {
                    claimAmount: claim.claimAmount as bigint,
                    confirmedAmount: claim.confirmedAmount as bigint,
                    state: claim.state,
                    modified_blockNumber: claim.modified.blockNumber,
                    modified_timestamp: claim.modified.timestamp as bigint,
                    modified_txHash: claim.modified.txHash,
                    modified_from: claim.modified.from
                },
                create: {
                    policyNftId: claim.policyNftId as bigint,
                    claimId: claim.claimId as bigint,
                    claimAmount: claim.claimAmount as bigint,
                    confirmedAmount: claim.confirmedAmount as bigint,
                    state: claim.state,
                    created_blockNumber: claim.created.blockNumber,
                    created_timestamp: claim.created.timestamp as bigint,
                    created_txHash: claim.created.txHash,
                    created_from: claim.created.from,
                    modified_blockNumber: claim.modified.blockNumber,
                    modified_timestamp: claim.modified.timestamp as bigint,
                    modified_txHash: claim.modified.txHash,
                    modified_from: claim.modified.from
                }
            });
        }
    }

    async persistPayouts(payouts: Payout[]): Promise<void> {
        for (const payout of payouts) {
            await this.prisma.payout.upsert({
                where: { policyNftId_payoutId: { 
                    policyNftId: payout.policyNftId as bigint, payoutId: payout.payoutId as bigint 
                }},
                update: {
                    beneficiary: payout.beneficiary,
                    payoutAmount: payout.payoutAmount as bigint,
                    paidAmount: payout.paidAmount as bigint,
                    cancelled: payout.cancelled,
                    modified_blockNumber: payout.modified.blockNumber,
                    modified_timestamp: payout.modified.timestamp as bigint,
                    modified_txHash: payout.modified.txHash,
                    modified_from: payout.modified.from
                },
                create: {
                    policyNftId: payout.policyNftId as bigint,
                    payoutId: payout.payoutId as bigint,
                    claimId: payout.claimId as bigint,
                    beneficiary: payout.beneficiary,
                    payoutAmount: payout.payoutAmount as bigint,
                    paidAmount: payout.paidAmount as bigint,
                    cancelled: payout.cancelled,
                    created_blockNumber: payout.created.blockNumber,
                    created_timestamp: payout.created.timestamp as bigint,
                    created_txHash: payout.created.txHash,
                    created_from: payout.created.from,
                    modified_blockNumber: payout.modified.blockNumber,
                    modified_timestamp: payout.modified.timestamp as bigint,
                    modified_txHash: payout.modified.txHash,
                    modified_from: payout.modified.from
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

    async processClaimSubmittedEvent(event: DecodedLogEntry, policies: Map<BigInt, Policy>, claims: Map<string,Claim>): Promise<Map<string, Claim>> {
        if (event.event_name !== 'LogClaimServiceClaimSubmitted') {
            throw new Error(`Invalid event type ${event.event_name}`);
        }

        logger.debug(`Processing claim submitted event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
        const data = this.decodeClaimServiceEvent(event);
        if (data === null || data === undefined) {
            logger.error(`Failed to decode event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
            return claims;
        }
        if (data.name !== 'LogClaimServiceClaimSubmitted') {
            throw new Error(`Invalid event name ${data.name}`);
        }

        const policyNftId = data.args[0] as BigInt;
        const claimId = data.args[1] as BigInt;
        const claimAmount = data.args[2] as BigInt;

        const policy = policies.get(policyNftId);
        if (policy === undefined) {
            logger.error(`Policy not found for nftId ${policyNftId}`);
            return claims;
        }

        const key = `${policyNftId}_${claimId}`;
        const claim = {
            policyNftId,
            claimId,
            claimAmount,
            confirmedAmount: null,
            state: ClaimState.CREATED,
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
        claims.set(key, claim);
        return claims;
    }

    async processClaimConfirmedEvent(event: DecodedLogEntry, claims: Map<string, Claim>): Promise<Map<string, Claim>> {
        if (event.event_name !== 'LogClaimServiceClaimConfirmed') {
            throw new Error(`Invalid event type ${event.event_name}`);
        }

        logger.debug(`Processing claim confirmed event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
        const data = this.decodeClaimServiceEvent(event);
        if (data === null || data === undefined) {
            logger.error(`Failed to decode event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
            return claims;
        }
        if (data.name !== 'LogClaimServiceClaimConfirmed') {
            throw new Error(`Invalid event name ${data.name}`);
        }

        const policyNftId = data.args[0] as BigInt;
        const claimId = data.args[1] as BigInt;
        const confirmedAmount = data.args[2] as BigInt;

        const key = `${policyNftId}_${claimId}`;
        const claim = claims.get(key);
        if (claim === undefined) {
            logger.error(`Claim not found for policyNftId ${policyNftId} and claimId ${claimId}`);
            return claims;
        }

        claim.confirmedAmount = confirmedAmount;
        claim.state = ClaimState.CONFIRMED;
        claim.modified = {
            blockNumber: event.block_number,
            timestamp: BigInt(new Date(event.block_time).getTime()),
            txHash: event.tx_hash,
            from: event.tx_from
        };
        return claims;
    }

    async processClaimDeclinedEvent(event: DecodedLogEntry, claims: Map<string, Claim>): Promise<Map<string, Claim>> {
        if (event.event_name !== 'LogClaimServiceClaimDeclined') {
            throw new Error(`Invalid event type ${event.event_name}`);
        }

        logger.debug(`Processing claim declined event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
        const data = this.decodeClaimServiceEvent(event);
        if (data === null || data === undefined) {
            logger.error(`Failed to decode event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
            return claims;
        }
        if (data.name !== 'LogClaimServiceClaimDeclined') {
            throw new Error(`Invalid event name ${data.name}`);
        }

        const policyNftId = data.args[0] as BigInt;
        const claimId = data.args[1] as BigInt;

        const key = `${policyNftId}_${claimId}`;
        const claim = claims.get(key);
        if (claim === undefined) {
            logger.error(`Claim not found for policyNftId ${policyNftId} and claimId ${claimId}`);
            return claims;
        }

        claim.state = ClaimState.DECLINED;
        claim.modified = {
            blockNumber: event.block_number,
            timestamp: BigInt(new Date(event.block_time).getTime()),
            txHash: event.tx_hash,
            from: event.tx_from
        };
        return claims;
    }

    async processClaimRevokedEvent(event: DecodedLogEntry, claims: Map<string, Claim>): Promise<Map<string, Claim>> {
        if (event.event_name !== 'LogClaimServiceClaimRevoked') {
            throw new Error(`Invalid event type ${event.event_name}`);
        }

        logger.debug(`Processing claim revoked event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
        const data = this.decodeClaimServiceEvent(event);
        if (data === null || data === undefined) {
            logger.error(`Failed to decode event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
            return claims;
        }
        if (data.name !== 'LogClaimServiceClaimRevoked') {
            throw new Error(`Invalid event name ${data.name}`);
        }

        const policyNftId = data.args[0] as BigInt;
        const claimId = data.args[1] as BigInt;

        const key = `${policyNftId}_${claimId}`;
        const claim = claims.get(key);
        if (claim === undefined) {
            logger.error(`Claim not found for policyNftId ${policyNftId} and claimId ${claimId}`);
            return claims;
        }

        claim.state = ClaimState.REVOKED;
        claim.modified = {
            blockNumber: event.block_number,
            timestamp: BigInt(new Date(event.block_time).getTime()),
            txHash: event.tx_hash,
            from: event.tx_from
        };
        return claims;
    }

    async processClaimCancelledEvent(event: DecodedLogEntry, claims: Map<string, Claim>): Promise<Map<string, Claim>> {
        if (event.event_name !== 'LogClaimServiceClaimCanceled') {
            throw new Error(`Invalid event type ${event.event_name}`);
        }

        logger.debug(`Processing claim canceled event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
        const data = this.decodeClaimServiceEvent(event);
        if (data === null || data === undefined) {
            logger.error(`Failed to decode event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
            return claims;
        }
        if (data.name !== 'LogClaimServiceClaimCanceled') {
            throw new Error(`Invalid event name ${data.name}`);
        }

        const policyNftId = data.args[0] as BigInt;
        const claimId = data.args[1] as BigInt;

        const key = `${policyNftId}_${claimId}`;
        const claim = claims.get(key);
        if (claim === undefined) {
            logger.error(`Claim not found for policyNftId ${policyNftId} and claimId ${claimId}`);
            return claims;
        }

        claim.state = ClaimState.CANCELLED;
        claim.modified = {
            blockNumber: event.block_number,
            timestamp: BigInt(new Date(event.block_time).getTime()),
            txHash: event.tx_hash,
            from: event.tx_from
        };
        return claims;
    }

    async processPayoutCreatedEvent(event: DecodedLogEntry, policies: Map<BigInt, Policy>, claims: Map<string, Claim>, payouts: Map<string, Payout>): Promise<Map<string, Payout>> {
        if (event.event_name !== 'LogClaimServicePayoutCreated') {
            throw new Error(`Invalid event type ${event.event_name}`);
        }

        logger.debug(`Processing payout created event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
        const data = this.decodeClaimServiceEvent(event);
        if (data === null || data === undefined) {
            logger.error(`Failed to decode event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
            return payouts;
        }
        if (data.name !== 'LogClaimServicePayoutCreated') {
            throw new Error(`Invalid event name ${data.name}`);
        }

        const policyNftId = data.args[0] as BigInt;
        const payoutId = data.args[1] as BigInt;
        // claimid is left shifted by 24 bytes and added to payoutId
        
        const payoutAmount = data.args[2] as BigInt;
        const beneficiary = data.args[3] as string;
        
        const policy = policies.get(policyNftId);
        if (policy === undefined) {
            logger.error(`Policy not found for nftId ${policyNftId}`);
            return payouts;
        }

        const claimId = data.args[1] as bigint >> BigInt(24);
        const claimKey = `${policyNftId}_${claimId}`;
        const claim = claims.get(claimKey);
        if (claim === undefined) {
            logger.error(`Claim not found for policyNftId ${policyNftId} and claimId ${claimId}`);
            return payouts;
        }

        // TODO: validate claimId

        const key = `${policyNftId}_${payoutId}`;
        const payout = {
            policyNftId,
            payoutId,
            claimId,
            beneficiary,
            payoutAmount,
            paidAmount: null,
            cancelled: false,
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
        payouts.set(key, payout);
        return payouts;
    }

    async processPayoutProcessedEvent(event: DecodedLogEntry, payouts: Map<string, Payout>): Promise<Map<string, Payout>> {
        if (event.event_name !== 'LogClaimServicePayoutProcessed') {
            throw new Error(`Invalid event type ${event.event_name}`);
        }

        logger.debug(`Processing payout processed event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
        const data = this.decodeClaimServiceEvent(event);
        if (data === null || data === undefined) {
            logger.error(`Failed to decode event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
            return payouts;
        }
        if (data.name !== 'LogClaimServicePayoutProcessed') {
            throw new Error(`Invalid event name ${data.name}`);
        }

        const policyNftId = data.args[0] as BigInt;
        const payoutId = data.args[1] as BigInt;
        const paidAmount = data.args[2] as BigInt;

        const key = `${policyNftId}_${payoutId}`;
        const payout = payouts.get(key);
        if (payout === undefined) {
            logger.error(`Payout not found for policyNftId ${policyNftId} and payoutId ${payoutId}`);
            return payouts;
        }

        payout.paidAmount = paidAmount;
        payout.modified = {
            blockNumber: event.block_number,
            timestamp: BigInt(new Date(event.block_time).getTime()),
            txHash: event.tx_hash,
            from: event.tx_from
        };
        return payouts;
    }

    async processPayoutCancelledEvent(event: DecodedLogEntry, payouts: Map<string, Payout>): Promise<Map<string, Payout>> {
        if (event.event_name !== 'LogClaimServicePayoutCancelled') {
            throw new Error(`Invalid event type ${event.event_name}`);
        }

        logger.debug(`Processing payout canceled event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
        const data = this.decodeClaimServiceEvent(event);
        if (data === null || data === undefined) {
            logger.error(`Failed to decode event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
            return payouts;
        }
        if (data.name !== 'LogClaimServicePayoutCancelled') {
            throw new Error(`Invalid event name ${data.name}`);
        }

        const policyNftId = data.args[0] as BigInt;
        const payoutId = data.args[1] as BigInt;

        const key = `${policyNftId}_${payoutId}`;
        const payout = payouts.get(key);
        if (payout === undefined) {
            logger.error(`Payout not found for policyNftId ${policyNftId} and payoutId ${payoutId}`);
            return payouts;
        }

        payout.cancelled = true;
        payout.modified = {
            blockNumber: event.block_number,
            timestamp: BigInt(new Date(event.block_time).getTime()),
            txHash: event.tx_hash,
            from: event.tx_from
        };
        return payouts;
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

    decodeClaimServiceEvent(event: DecodedLogEntry) {
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
        return IClaimService__factory.createInterface().parseLog({ topics: [topic0, topic1, topic2, topic3], data: event.data });
    }
}