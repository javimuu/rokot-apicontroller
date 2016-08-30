import * as _ from "underscore";
import {AllowedHttpVerbs} from "../decorators";
import {INewable, MiddewareFunctionDictionary, IStringDictionary, IApiController, IApiControllerRoute, IMiddewareProvider, INewableConstructor, MiddewareProviderType, IMiddewareFunction} from "../core";
import {Logger} from "bunyan";

interface IMiddlewareModel {
  found: MiddewareProviderType[]
  foundKeys: string[]
  foundProviders: IMiddewareProvider[]
  middlewareFunctionDictionary: IStringDictionary<IMiddewareFunction>
}

export class ApiExplorer {
  static forEachControllerRoute(apiControllers: IApiController[], action: (c: IApiController, r: IApiControllerRoute) => void) {
    apiControllers.forEach(c => c.routes.forEach(r => action(c, r)))
  }

  static getMiddewareKey(type: MiddewareProviderType) {
    return _.isString(type) ? type : type.key
  }

  private static middewareSimpleType(types: MiddewareProviderType[]) {
    return types.filter(k => _.isString(k)) as string[]
  }

  private static middewareProviderType(types: MiddewareProviderType[]) {
    return types.filter(k => !_.isString(k)) as IMiddewareProvider[]
  }

  private static getAllMiddleware(apiControllers: IApiController[]) {
    const middleware: MiddewareProviderType[] = []
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

  static getMiddlewareErrors(logger: Logger, apiControllers: IApiController[], middlewareFunctions: MiddewareFunctionDictionary) {
    const model = this.createMiddlewareModel(apiControllers, middlewareFunctions)
    return this.validateMiddlewareModel(logger, model)
  }

  private static createMiddlewareModel(apiControllers: IApiController[], middlewareFunctions: MiddewareFunctionDictionary): IMiddlewareModel {
    const found = this.getAllMiddleware(apiControllers);

    return {
      middlewareFunctionDictionary: middlewareFunctions,
      found,
      foundKeys: _.uniq(this.middewareSimpleType(found)),
      //registeredKeys: this.middewareSimpleType(middlewareFunctions.map(f => f.key)),
      foundProviders: this.middewareProviderType(found),
      //registeredProviders: this.middewareProviderType(middlewareFunctions.map(f => f.key))
    }
  }

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
    model.foundKeys.forEach(key => {
      const found = model.middlewareFunctionDictionary[key]
      if (!found) {
        errors.push(`Missing middleware key '${key}'`);
      } else if (!this.matchMiddlewareProviderParams(logger, found, [])) {
        errors.push(`Middleware key '${found.key}' requires parameters that have not been specified (you must specify minimum of ${found.paramMin}, max of ${found.paramMax})`);
      }
    })

    //const existingProviderKeys = model.registeredProviders.map(p => p.key)
    model.foundProviders.forEach(provider => {
      const found = model.middlewareFunctionDictionary[provider.key]
      if (!found) {
        errors.push(`Missing middleware provider with key '${provider.key}'`);
        return;
      }

      if (!this.matchMiddlewareProviderParams(logger, found, provider.params)) {
        const safeLength = provider.params ? provider.params.length : 0
        errors.push(`Middleware key '${found.key}' requires parameters that have not been specified correctly (${safeLength} provided [${provider.params}], min = ${found.paramMin}, max = ${found.paramMax})`);
      }
    })
    return errors
  }

  private static matchMiddlewareProviderParams(logger: Logger, mwf: IMiddewareFunction, right: any[]) {
    // if (!left || !right) {
    //     return false
    // }
    const safeLength = right ? right.length : 0
    if (_.isUndefined(mwf.paramMin) || _.isUndefined(mwf.paramMax)) {
      if (safeLength > 0) {
        logger.warn(`Middleware function: '${mwf.key}' does not require parameters, but is being invoked with values that will never be used`)
      }

      return true
    }
    if (safeLength < mwf.paramMin || safeLength > mwf.paramMax) {
      return false;
    }
    return true
  }
}
