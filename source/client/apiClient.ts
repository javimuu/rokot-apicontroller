import * as _ from "underscore";
import {Logger} from "bunyan";
import {ApiClientBuilder,IApiClient} from "./apiClientBuilder";
import {createApi,createDefaultApi} from "../server/api";
import {IApi,IApiController,MiddewareFunctionDictionary} from "../core";

/** Create the default Api Client instance using the supplied source paths and all @api decorated controllers and middleware functions*/
export function createDefaultApiClient(logger: Logger, sourcePaths: string[]):IApiClient {
  return createApiClient(logger, sourcePaths, createDefaultApi(logger))
}

/** Create an Api Client instance using the supplied source paths, controllers and middleware functions*/
export function createCustomApiClient(logger: Logger, sourcePaths: string[], apiControllers: IApiController[],middlewareFunctions:MiddewareFunctionDictionary):IApiClient {
  return createApiClient(logger, sourcePaths, createApi(logger, apiControllers, middlewareFunctions))
}

/** Create an Api Client instance using the supplied source paths and api*/
export function createApiClient(logger: Logger, sourcePaths: string[], api: IApi):IApiClient {
  const apiClientBuilder = new ApiClientBuilder(logger)
  return apiClientBuilder.build(sourcePaths, api)
}
