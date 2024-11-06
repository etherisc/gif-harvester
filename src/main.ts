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
        const latestBlockData = await this.fetchDuneData(DUNE_QUERY_ID_BASE_LATEST_BLOCK);

        const latestBaseBlock = latestBlockData.rows[0]._col0;

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
        logger.debug(`Execution ID: ${executionId}`);

        // poll state until execution is done
        console.log('Waiting for execution to finish');
        const executeStatusUrl = `${DUNE_API_BASE_URL}/v1/execution/${executionId}/status`;
        let state = 'QUERY_STATE_PENDING';
        while (state === 'QUERY_STATE_PENDING' || state === 'QUERY_STATE_EXECUTING') {
            const executeStatusUrlResponse = await axios.get(executeStatusUrl, {
                headers: {
                    'x-dune-api-key': DUNE_API_KEY
                }
            });
            state = executeStatusUrlResponse.data.state;
            logger.debug(`Status: ${state}`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const url = `${DUNE_API_BASE_URL}/v1/execution/${executionId}/results`;
        logger.debug(`Fetching results from ${url}`);
        // fetch with axios
        const response = await axios.get(url, {
            headers: {
                'x-dune-api-key': DUNE_API_KEY
            }
        });

        const result = response.data.result;

        logger.info(`Latest block: ${JSON.stringify(result)}`);
        return result;
    }

}

new Main().main();
