import { logger } from "../logger";

export enum ObjectType {
    PROTOCOL,
    REGISTRY,
    STAKING,
    RELEASE,
    ROLE,
    SERVICE,
    INSTANCE,
    COMPONENT,
    PRODUCT,
    ORACLE,
    DISTRIBUTION,
    POOL,
    APPLICATION,
    POLICY,
    BUNDLE,
    DISTRIBUTOR,
    STAKE,
    TARGET,
    ACCOUNTING,
    FEE,
    PRICE,
    PREMIUM,
    RISK,
    CLAIM,
    PAYOUT,
    REQUEST,
    DISTRIBUTOR_TYPE,
    REFERRAL,
    CORE,
    CUSTOM,
    ALL
}

export function getObjectType(type: BigInt): ObjectType {
    logger.debug(`getObjectType(${type})`);
    switch (type) {
        case BigInt(1):
            return ObjectType.PROTOCOL;
        // case 2:
        //     return ObjectType.REGISTRY;
        // case 3:
        //     return ObjectType.STAKING;
        // case 6:
        //     return ObjectType.RELEASE;
        // case 7:
        //     return ObjectType.ROLE;
        case BigInt(8):
            return ObjectType.SERVICE;
        case BigInt(10):
            return ObjectType.INSTANCE;
        // case 11:
        //     return ObjectType.COMPONENT;
        case BigInt(12):
            return ObjectType.PRODUCT;
        case BigInt(13):
            return ObjectType.ORACLE;
        // case 14:
        //     return ObjectType.DISTRIBUTION;
        case BigInt(15):
            return ObjectType.POOL;
        // case 20:
        //     return ObjectType.APPLICATION;
        case BigInt(21):
            return ObjectType.POLICY;
        case BigInt(22):
            return ObjectType.BUNDLE;
        // case 23:
        //     return ObjectType.DISTRIBUTOR;
        // case 30:
        //     return ObjectType.STAKE;
        // case 31:
        //     return ObjectType.TARGET;
        // case 40:
        //     return ObjectType.ACCOUNTING;
        // case 41:
        //     return ObjectType.FEE;
        // case 42:
        //     return ObjectType.PRICE;
        // case 43:
        //     return ObjectType.PREMIUM;
        // case 44:
        //     return ObjectType.RISK;
        // case 45:
        //     return ObjectType.CLAIM;
        // case 46:
        //     return ObjectType.PAYOUT;
        // case 47:
        //     return ObjectType.REQUEST;
        // case 48:
        //     return ObjectType.DISTRIBUTOR_TYPE;
        // case 49:
        //     return ObjectType.REFERRAL;
        // case 97:
        //     return ObjectType.CORE;
        // case 98:
        //     return ObjectType.CUSTOM;
        // case 99:
        //     return ObjectType.ALL;
        default:
            throw new Error("Invalid ObjectType");
    }
}