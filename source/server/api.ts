import * as _ from "underscore";
import {Logger} from "bunyan";
import {ApiBuilder} from "../server/apiBuilder";
import {IApiController,IApi,IRuntimeApi,MiddewareFunctionDictionary} from "../core";
import {middlewareFunctions,apiControllers} from "../decorators";

/** Create the default Api instance using all @api decorated controllers and middleware functions*/
export function createDefaultApi(logger: Logger):IApi {
  return createApi(logger, apiControllers, middlewareFunctions)
}

/** Create an Api instance using the supplied controllers and middleware functions*/
export function createApi(logger: Logger, apiControllers: IApiController[],middlewareFunctions:MiddewareFunctionDictionary):IApi {
  const apiBuilder = new ApiBuilder(logger);
  return apiBuilder.build(apiControllers, middlewareFunctions)
}

/** Create the default Runtime Api instance using all @api decorated controllers and middleware functions*/
export function createDefaultRuntimeApi(logger: Logger):IRuntimeApi {
  return createRuntimeApi(logger, apiControllers, middlewareFunctions)
}

/** Create a Runtime Api instance using the supplied controllers and middleware functions*/
export function createRuntimeApi(logger: Logger, apiControllers: IApiController[],middlewareFunctions:MiddewareFunctionDictionary):IRuntimeApi {
  const apiBuilder = new ApiBuilder(logger);
  return apiBuilder.buildRuntime(apiControllers, middlewareFunctions)
}
