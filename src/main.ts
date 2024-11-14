import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as dotenv from 'dotenv';
import { DUNE_API_BASE_URL, DUNE_API_KEY, DUNE_QUERY_ID_INSTANCE_SERVICE_EVENTS, DUNE_QUERY_ID_NFT_REGISTRATION_EVENTS, DUNE_QUERY_ID_NFT_TRANSFER_EVENTS } from './constants';
import InstanceProcessor from './instance_processor';
import { logger } from './logger';
import NftProcessor from './nft_processor';
import { ObjectType } from './types/objecttype';
import DuneApi from './dune';

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

    constructor(prisma: PrismaClient) {
        this.dune = new DuneApi();
        this.nftProcessor = new NftProcessor(prisma);
        this.instanceProcessor = new InstanceProcessor(prisma);

    }

    public async main(): Promise<void> {
        const nftRegistrationEvents = await this.dune.getLatestResult(DUNE_QUERY_ID_NFT_REGISTRATION_EVENTS, 0);
        const nftTransferEvents = await this.dune.getLatestResult(DUNE_QUERY_ID_NFT_TRANSFER_EVENTS, 0);

        let nfts = await this.nftProcessor.processNftRegistrationEvents(nftRegistrationEvents);
        nfts = await this.nftProcessor.processNftTransferEvents(nftTransferEvents, nfts);
        await this.nftProcessor.persistNfts(nfts);

        // print one log per event
        nfts.forEach(event => {
            logger.info(`NFT: ${event.nftId} - ${ObjectType[event.objectType]} - ${event.objectAddress} - ${event.owner}`);
        });

        const instanceEvents = await this.dune.getLatestResult(DUNE_QUERY_ID_INSTANCE_SERVICE_EVENTS, 0);
        const instances = await this.instanceProcessor.processInstanceServiceEvents(instanceEvents);
        await this.instanceProcessor.persistInstances(instances);

        // print one log per event
        instances.forEach(event => {
            logger.info(`Instance: ${event.nftId} - ${event.instanceAddress}`);
        });
    }

}

const prisma = new PrismaClient()
try {
    new Main(prisma).main();
} finally {
    prisma.$disconnect();
}
