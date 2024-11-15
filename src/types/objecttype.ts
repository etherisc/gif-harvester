import { logger } from "../logger";

export enum ObjectType {
    UNKNOWN,
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
    // logger.debug(`getObjectType(${type})`);
    switch (type) {
        case BigInt(0):
            return ObjectType.UNKNOWN;
        case BigInt(1):
            return ObjectType.PROTOCOL;
        case BigInt(8):
            return ObjectType.SERVICE;
        case BigInt(10):
            return ObjectType.INSTANCE;
        case BigInt(12):
            return ObjectType.PRODUCT;
        case BigInt(13):
            return ObjectType.ORACLE;
        case BigInt(15):
            return ObjectType.POOL;
        case BigInt(21):
            return ObjectType.POLICY;
        case BigInt(22):
            return ObjectType.BUNDLE;
        default:
            throw new Error("Invalid ObjectType");
    }
}