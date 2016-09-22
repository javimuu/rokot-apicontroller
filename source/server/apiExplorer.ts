import * as _ from "underscore";
import {INewable, MiddewareFunctionDictionary, IApiController, IApiControllerRoute, IMiddlewareKey, INewableConstructor, IMiddewareFunction} from "../core";
import {Logger} from "bunyan";

interface IMiddlewareModel {
  found: IMiddlewareKey[]
  middlewareFunctionDictionary: MiddewareFunctionDictionary
}

/** Api Explorer: Helper methods, used to iterate and validate Api aspects */
export class ApiExplorer {

  static forEachControllerRoute(apiControllers: IApiController[], action: (c: IApiController, r: IApiControllerRoute) => void) {
    apiControllers.forEach(c => c.routes.forEach(r => action(c, r)))
  }

  private static getAllMiddleware(apiControllers: IApiController[]) {
    const middleware: IMiddlewareKey[] = []
    this.forEachControllerRoute(apiControllers, (c, route) => {
      if (route.middlewares) {
        route.middlewares.forEach(key => {
          if (middleware.indexOf(key) === -1) {
            middleware.push(key);
          }
        })
      }
    })
    return middleware;
  }

  /** finds errors in middleware registrations */
  static getMiddlewareErrors(logger: Logger, apiControllers: IApiController[], middlewareFunctions: MiddewareFunctionDictionary) {
    const model = this.createMiddlewareModel(apiControllers, middlewareFunctions)
    return this.validateMiddlewareModel(logger, model)
  }

  private static createMiddlewareModel(apiControllers: IApiController[], middlewareFunctions: MiddewareFunctionDictionary): IMiddlewareModel {
    return {
      middlewareFunctionDictionary: middlewareFunctions,
      found: this.getAllMiddleware(apiControllers)
    }
  }

  /** finds errors in route path registrations - checks for duplicate route-verb combinations */
  static getRouteErrors(apiControllers: IApiController[]) {
    const errors: string[] = []
    const groups: {
      key: string;
      route: IApiControllerRoute;
      verb: string;
      controller: IApiController
    }[] = []
    this.forEachControllerRoute(apiControllers, (controller, route) => {
      route.verbs.forEach(verb => {
        groups.push({ key: `${route.route}|${verb}`, route, controller, verb });
      });
    })

    var g = _.groupBy(groups, g => g.key);
    for (const member in g) {
      const members = g[member];
      if (members.length > 1) {
        errors.push(`Duplicate route (${members[0].verb}: ${members[0].route.route}) found for ${members.map(m => `${m.controller.name}.${m.route.memberName}`).join(",")}`);
      }
    }
    return errors
  }

  private static validateMiddlewareModel(logger: Logger, model: IMiddlewareModel) {
    const errors: string[] = []
    model.found.forEach(key => {
      const found = model.middlewareFunctionDictionary[key.key]
      if (!found) {
        errors.push(`Missing middleware key '${key.key}'`);
      } else if (!this.matchMiddlewareProviderParams(logger, found, key)) {
        errors.push(`Middleware key '${found.key}' ${key.params ? `has invalid ["${key.params.join(`","`)}"]` : "is missing required"} parameters (you must specify minimum of ${found.paramMin}, maximum of ${found.paramMax})`);
      }
    })

    return errors
  }

  private static matchMiddlewareProviderParams(logger: Logger, mwf: IMiddewareFunction, key: IMiddlewareKey) {
    const safeLength = key.params ? key.params.length : 0
    if (_.isUndefined(mwf.paramMin) || _.isUndefined(mwf.paramMax)) {
      if (safeLength > 0) {
        logger.warn(`Middleware function: '${mwf.key}' does not require parameters, but is being supplied with values '${key.params ? key.params.join(',') : ""}' that will never be used`)
        delete key.params
      }

      return true
    }
    if (safeLength < mwf.paramMin || safeLength > mwf.paramMax) {
      return false;
    }
    return true
  }
}
