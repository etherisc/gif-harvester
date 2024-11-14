export interface DecodedLogEntry {
    block_date: string;
    block_time: string;
    block_number: number;
    namespace: string;
    contract_name: string;
    contract_address: string;
    tx_hash: string;
    tx_from: string;
    tx_to: string;
    index: number;
    signature: string;
    event_name: string;
    block_hash: string;
    topic0: string;
    topic1: string;
    topic2: string;
    topic3: string;
    data: string;
    tx_index: number;
}