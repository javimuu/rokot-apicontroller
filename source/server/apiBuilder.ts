import {Shared} from "../shared";
import {ApiExplorer} from "./apiExplorer";
import * as _ from "underscore";
import {Logger} from "bunyan";
import {IApiControllerRoute,IMiddewareFunction, IApiController,IApiBuilder, IApi,INewable, MiddewareProviderType, MiddewareFunctionDictionary} from "../core";

export class ApiBuilder implements IApiBuilder {
  constructor(protected logger: Logger){
  }
  private errors: string[] = [];
  protected onError(message: string){
    this.errors.push(message);
    this.logger.error(message)
  }

  protected reset(){
    this.errors = []
  }

  build(apiControllers: IApiController[], middlewareFunctions: MiddewareFunctionDictionary): IApi {
    this.reset();
    this.logger.trace(`Runtime Compile started`)
    let controllers = apiControllers.filter(t => this.validateApiControllerRoutes(t));
    const api = { controllers, errors: this.errors } as IApi;
    this.validate(controllers, middlewareFunctions);
    this.logger.trace(`Runtime Compile completed`)
    return api;
  }

  private ensureNoDuplicateRoutes(apiControllers: IApiController[]) {
    ApiExplorer.getRouteErrors(apiControllers).forEach(error => {
      this.onError(error);
    })
  }

  private validate(apiControllers: IApiController[], middlewareFunctions: MiddewareFunctionDictionary) {
    this.ensureNoDuplicateRoutes(apiControllers)
    const errors = ApiExplorer.getMiddlewareErrors(this.logger, apiControllers,middlewareFunctions)
    if (errors.length) {
      errors.forEach(err => this.onError(err))
    }
  }

  private validateApiControllerRoutes(apiController: IApiController) {
    this.logger.trace(`Processing ${apiController.name}`)
    const routes = apiController.routes;
    routes && routes.forEach(r => {
      const value = r.func;
      if (!value || !_.isFunction(value)) {
        this.logger.trace(`- ${r.memberName} (ignored)`)
        return;
      }
      this.logger.trace(`- ${r.memberName} ${r.route} [${r.verbs.map(rv => `${rv}`).join(",")}]`)
    })
    if (!routes || !routes.length) {
      this.logger.trace(`> no routes found (ignored)`)
      return false;
    }
    return true;
  }
}
