import { PrismaClient } from "@prisma/client";
import { getObjectType, ObjectType } from "./types/objecttype";
import { logger } from "./logger";
import { IComponentService__factory, IRegistry__factory } from "./generated/contracts/gif";
import { DecodedLogEntry } from "./types/logdata";
import { Nft } from "./types/nft";
import { log } from "console";
import { Component } from "./types/component";

export default class ComponentProcessor {
    private prisma: PrismaClient;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
    }

    async persistComponents(components: Component[]): Promise<void> {
        for (const component of components) {
            await this.prisma.component.upsert({
                where: { nftId: component.nftId as bigint },
                update: {
                    instanceNftId: component.instanceNftId as bigint,
                    componentType: ObjectType[component.componentType],
                    token: component.token,
                    modified_blockNumber: component.modified.blockNumber,
                    modified_timestamp: component.modified.timestamp as bigint,
                    modified_txHash: component.modified.txHash,
                    modified_from: component.modified.from
                },
                create: {
                    nftId: component.nftId as bigint,
                    instanceNftId: component.instanceNftId as bigint,
                    componentType: ObjectType[component.componentType],
                    token: component.token,
                    created_blockNumber: component.created.blockNumber,
                    created_timestamp: component.created.timestamp as bigint,
                    created_txHash: component.created.txHash,
                    created_from: component.created.from,
                    modified_blockNumber: component.modified.blockNumber,
                    modified_timestamp: component.modified.timestamp as bigint,
                    modified_txHash: component.modified.txHash,
                    modified_from: component.modified.from
                }
            });
        }
    }

    async processComponentRegisteredEvent(event: DecodedLogEntry, components: Map<BigInt, Component>): Promise<Map<BigInt, Component>> {
        if (event.event_name !== 'LogComponentServiceRegistered') {
            throw new Error(`Invalid event type ${event.event_name}`);
        }

        logger.info(`Processing nft registration event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
        const data = this.decodeComponentServiceEvent(event);
        if (data === null || data === undefined) {
            logger.error(`Failed to decode event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
            return components;
        }
        if (data.name !== 'LogComponentServiceRegistered') {
            throw new Error(`Invalid event name ${data.name}`);
        }

        const instanceNftId = data.args[0] as BigInt;
        const nftId = data.args[1] as BigInt;
        const componentType = getObjectType(BigInt(data.args[2]));
        const token = data.args[4] as string;
        
        const component = {
            nftId,
            instanceNftId,
            componentType,
            token,
            created: {
                blockNumber: event.block_number,
                timestamp:BigInt(new Date(event.block_time).getTime()),
                txHash: event.tx_hash,
                from: event.tx_from
            },
            modified: {
                blockNumber: event.block_number,
                timestamp:BigInt(new Date(event.block_time).getTime()),
                txHash: event.tx_hash,
                from: event.tx_from
            }
        } as Component;
        components.set(nftId, component);
        return components;
    }

    decodeComponentServiceEvent(event: DecodedLogEntry) {
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
        return IComponentService__factory.createInterface().parseLog({ topics: [topic0, topic1, topic2, topic3], data: event.data });
    }
}