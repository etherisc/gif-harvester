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

    constructor(prisma: PrismaClient) {
        this.dune = new DuneApi();
        this.nftProcessor = new NftProcessor(prisma);
        this.instanceProcessor = new InstanceProcessor(prisma);
        this.policyProcessor = new PolicyProcessor(prisma);
    }

    public async main(): Promise<void> {
        const gifEvents = await this.dune.getLatestResult(DUNE_QUERY_ID_GIF_EVENTS, 0);
        const { nfts, instances, policies } = await this.parseGifEvents(gifEvents);

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
        : Promise<{ nfts: Map<BigInt, Nft>, instances: Map<BigInt, Instance>, policies: Map<BigInt, Policy> }> 
    {
        const nfts = new Map<BigInt, Nft>();
        const instances = new Map<BigInt, Instance>();
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
                case 'LogApplicationServiceApplicationCreated':
                    await this.policyProcessor.processApplicationCreatedEvent(event, policies);
                    break;
                case 'LogPolicyServicePolicyCreated':
                    await this.policyProcessor.processPolicyCreatedEvent(event, policies);
                    break;
                case 'LogPolicyServicePolicyPremiumCollected':
                    await this.policyProcessor.processPolicyPremiumCollectedEvent(event, policies);
                    break;
            }
        }

        return { nfts, instances, policies };
    }
}

const prisma = new PrismaClient()
try {
    new Main(prisma).main();
} finally {
    prisma.$disconnect();
}
