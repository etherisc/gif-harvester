import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as dotenv from 'dotenv';
import { DUNE_API_BASE_URL, DUNE_API_KEY, DUNE_QUERY_ID_GIF_EVENTS, DUNE_QUERY_ID_INSTANCE_SERVICE_EVENTS, DUNE_QUERY_ID_NFT_REGISTRATION_EVENTS, DUNE_QUERY_ID_NFT_TRANSFER_EVENTS } from './constants';
import InstanceProcessor from './instance_processor';
import { logger } from './logger';
import NftProcessor from './nft_processor';
import { ObjectType } from './types/objecttype';
import DuneApi from './dune';
import { DecodedLogEntry } from './types/logdata';
import { Nft } from './types/nft';
import { Instance } from './types/instance';
import PolicyProcessor from './policy_processor';
import { Policy } from './types/policy';
import ComponentProcessor from './component_processor';
import { Component } from './types/component';
import RiskProcessor from './risk_processor';
import { Risk } from './types/risk';

dotenv.config();

// @ts-expect-error BigInt is not defined in the global scope
BigInt.prototype.toJSON = function () {
    const int = Number.parseInt(this.toString());
    return int ?? this.toString();
};

class Main {
    private dune: DuneApi;
    private nftProcessor: NftProcessor;
    private instanceProcessor: InstanceProcessor;
    private policyProcessor: PolicyProcessor;
    private componentProcessor: ComponentProcessor;
    private riskProcessor: RiskProcessor;

    constructor(prisma: PrismaClient) {
        this.dune = new DuneApi();
        this.nftProcessor = new NftProcessor(prisma);
        this.instanceProcessor = new InstanceProcessor(prisma);
        this.componentProcessor = new ComponentProcessor(prisma);
        this.policyProcessor = new PolicyProcessor(prisma);
        this.riskProcessor = new RiskProcessor(prisma);
    }

    public async main(): Promise<void> {
        const gifEvents = await this.dune.getLatestResult(DUNE_QUERY_ID_GIF_EVENTS, 0);
        const { nfts, instances, policies, components, risks } = await this.parseGifEvents(gifEvents);

        await this.nftProcessor.persistNfts(Array.from(nfts.values()));
        await this.instanceProcessor.persistInstances(Array.from(instances.values()));
        await this.policyProcessor.persistPolicies(Array.from(policies.values()));
        await this.componentProcessor.persistComponents(Array.from(components.values()));
        await this.riskProcessor.persistRisks(Array.from(risks.values()));

        for (const nft of nfts.values()) {
            logger.info(`NFT: ${nft.nftId} - ${ObjectType[nft.objectType]} - ${nft.objectAddress} - ${nft.owner}`);
        };

        for (const instance of instances.values()) {
            logger.info(`Instance: ${instance.nftId} - ${instance.instanceAddress}`);
        }

        for (const policy of policies.values()) {
            logger.info(`Policy: ${policy.nftId} - ${policy.riskId} - ${policy.sumInsuredAmount}`);
        }
    }

    async parseGifEvents(gifEvents: Array<DecodedLogEntry>)
        : Promise<{ 
            nfts: Map<BigInt, Nft>, 
            instances: Map<BigInt, Instance>, 
            policies: Map<BigInt, Policy>,
            components: Map<BigInt, Component>,
            risks: Map<string, Risk>,
        }> 
    {
        const nfts = new Map<BigInt, Nft>();
        const instances = new Map<BigInt, Instance>();
        const components = new Map<BigInt, Component>();
        const risks = new Map<string, Risk>();
        const policies = new Map<BigInt, Policy>();

        for (const event of gifEvents) {
            // logger.debug(`Processing gif event ${event.tx_hash} - ${event.block_number} - ${event.event_name}`);

            switch (event.event_name) {
                case 'Transfer': 
                    await this.nftProcessor.processNftTransferEvent(event, nfts);
                    break;
                case 'LogRegistryObjectRegistered':
                    await this.nftProcessor.processNftRegistrationEvent(event, nfts);
                    break;
                case 'LogInstanceServiceInstanceCreated':
                    await this.instanceProcessor.processInstanceServiceEvent(event, instances);
                    break;
                case 'LogComponentServiceRegistered':
                    await this.componentProcessor.processComponentRegisteredEvent(event, components);
                    break;
                case 'LogRiskServiceRiskCreated':
                    await this.riskProcessor.processRiskCreatedEvent(event, risks);
                    break;
                case 'LogRiskServiceRiskUpdated':
                    await this.riskProcessor.processRiskUpdatedEvent(event, risks);
                    break;
                case 'LogRiskServiceRiskLocked':
                    await this.riskProcessor.processRiskLockedEvent(event, risks);
                    break;
                case 'LogRiskServiceRiskUnlocked':
                    await this.riskProcessor.processRiskUnlockedEvent(event, risks);
                    break;
                case 'LogRiskServiceRiskClosed':
                    await this.riskProcessor.processRiskClosedEvent(event, risks);
                    break;
                case 'LogApplicationServiceApplicationCreated':
                    await this.policyProcessor.processApplicationCreatedEvent(event, policies);
                    break;
                case 'LogPolicyServicePolicyCreated':
                    await this.policyProcessor.processPolicyCreatedEvent(event, policies);
                    break;
                case 'LogPolicyServicePolicyPremiumCollected':
                    await this.policyProcessor.processPolicyPremiumCollectedEvent(event, policies);
                    break;
                case 'LogPolicyServicePolicyExpirationUpdated':
                    await this.policyProcessor.processPolicyExpirationUpdatedEvent(event, policies);
                    break;
                case 'LogPolicyServicePolicyClosed':
                    await this.policyProcessor.processPolicyClosedEvent(event, policies);
                    break;

                default:
                    logger.info('Unhandeled event: ' + event.event_name);
            }
        }

        return { nfts, instances, policies, components, risks };
    }
}

const prisma = new PrismaClient()
try {
    new Main(prisma).main();
} finally {
    prisma.$disconnect();
}
