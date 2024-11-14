import * as dotenv from 'dotenv';
import { DUNE_API_BASE_URL, DUNE_API_KEY, DUNE_QUERY_ID_BASE_LATEST_BLOCK } from './constants';
import axios from 'axios';
import { Logger } from 'winston';
import { logger } from './logger';

dotenv.config();

class Main {

    constructor() {
    }

    public async main(): Promise<void> {
        await this.fetchLatestBlock();        
    }

    async fetchLatestBlock() {
        logger.info('Fetching latest block');
        const latestBlockDataRows = await this.fetchDuneData(DUNE_QUERY_ID_BASE_LATEST_BLOCK);

        const latestBaseBlock = latestBlockDataRows[0]._col0;

        logger.info(`Latest block: ${latestBaseBlock}`);
    }

    async fetchDuneData(queryId: string): Promise<any> {
        logger.info('Executing query ' + queryId);
        logger.debug('trigger execution')
        const executeQueryUrl = `${DUNE_API_BASE_URL}/v1/query/${queryId}/execute`;
        const executeQueryUrlResponse = await axios.post(executeQueryUrl, {}, {
            headers: {
                'x-dune-api-key': DUNE_API_KEY
            }
        });
        const executionId = executeQueryUrlResponse.data.execution_id;
        logger.info(`Execution ID: ${executionId}`);

        // poll state until execution is done
        const executeStatusUrl = `${DUNE_API_BASE_URL}/v1/execution/${executionId}/status`;
        let state = 'QUERY_STATE_PENDING';
        let totalRowCount = 0;
        while (state === 'QUERY_STATE_PENDING' || state === 'QUERY_STATE_EXECUTING') {
            const executeStatusUrlResponse = await axios.get(executeStatusUrl, {
                headers: {
                    'x-dune-api-key': DUNE_API_KEY
                }
            });
            state = executeStatusUrlResponse.data.state;
            logger.debug(executeStatusUrlResponse.data);
            totalRowCount = executeStatusUrlResponse.data?.result_metadata?.total_row_count;
            logger.debug(`Status: ${state} - ${totalRowCount} rows`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        logger.info(`Execution finished - fetching results`);

        const url = `${DUNE_API_BASE_URL}/v1/execution/${executionId}/results`;
        const rows = [];
        const limit = 1000;
        let offset = 0;
        logger.debug(`Fetching results for execution ${executionId}`);
        while (offset * limit < totalRowCount) {
            // fetch results in chunks
            logger.debug(`Fetching results offset ${offset} limit ${limit}`);
            const response = await axios.get(`${url}?limit=${limit}&offset=${offset}`, {
                headers: {
                    'x-dune-api-key': DUNE_API_KEY
                }
            });
            rows.push(...response.data.result.rows);
            offset += limit;
        }

        logger.info(`Fetched ${rows.length} rows`);

        // const result = response.data.result;

        return rows;
    }

}

new Main().main();
