import {Shared} from "../shared";
import {ApiExplorer} from "./apiExplorer";
import * as _ from "underscore";
import {Logger} from "bunyan";
import {IApiController,IApi, IRuntimeApi, MiddewareFunctionDictionary} from "../core";

/** Validates the supplied controllers and middleware functions and builds an IApi model */
export class ApiBuilder {
  /** Creates an instance of an ApiBuilder - can be singleton */
  constructor(protected logger: Logger){
  }

  protected onError(errors: string[], message: string){
    errors.push(message);
    this.logger.error(message)
  }

  /** Validates the supplied controllers and middleware functions and builds an IApi model */
  buildRuntime(apiControllers: IApiController[], middlewareFunctions: MiddewareFunctionDictionary): IRuntimeApi {
    const api = this.build(apiControllers, middlewareFunctions)
    return { errors: api.errors, controllers: api.controllers, middlewareFunctions };
  }

  /** Validates the supplied controllers and middleware functions and builds an IApi model */
  build(apiControllers: IApiController[], middlewareFunctions: MiddewareFunctionDictionary): IApi {
    const errors: string[] = [];
    this.logger.trace(`Building Api model`)
    let controllers = apiControllers.filter(t => this.filterApiControllerRoutes(t));
    this.validate(errors, controllers, middlewareFunctions);
    this.logger.trace(`Api model built ${errors.length ? " with errors" : ""}`)
    const api: IApi = { controllers };
    if (errors.length) {
      api.errors = errors
    }
    return api;
  }

  private validate(errors: string[], apiControllers: IApiController[], middlewareFunctions: MiddewareFunctionDictionary) {
    ApiExplorer.getRouteErrors(apiControllers).forEach(error => {
      this.onError(errors, error);
    })
    const errs = ApiExplorer.getMiddlewareErrors(this.logger, apiControllers,middlewareFunctions)
    if (errs.length) {
      errs.forEach(err => this.onError(errors, err))
    }
  }

  private filterApiControllerRoutes(apiController: IApiController) {
    this.logger.trace(`Processing controller ${apiController.name}`)
    const routes = apiController.routes;
    routes && routes.forEach(r => {
      this.logger.trace(`: '${r.memberName}' @ "${r.route}" [verbs: ${r.verbs.join(",")}]`)
    })
    if (!routes || !routes.length) {
      this.logger.trace(`> no routes found (ignored)`)
      return false;
    }
    return true;
  }
}
