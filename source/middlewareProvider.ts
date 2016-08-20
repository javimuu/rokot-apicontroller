import {Shared,ApiControllerExplorer} from "./shared";
import {Logger} from "bunyan";
import * as _ from "underscore";
import {IRouteBuilder,IMiddewareFunction, IApiControllerRoute, IApiController, IApiRequestHandler, IApiControllerRouteVerb, IApi} from "./core";
import {ApiControllerCompiler} from "./apiControllerCompiler";

export class MiddlewareProvider {
  constructor(private logger: Logger, private middlewares: IMiddewareFunction[]) { }

  get(apiControllers: IApiController[]) {
    const invalidMiddleware: string[] = []
    const collected: {[key:string]: Function} = {}

    const keys = ApiControllerExplorer.getAllMiddlewareKeys(apiControllers);
    var mws = this.middlewares.map(m => m.key);
    keys.forEach(key => {
      const idx = mws.indexOf(key);
      if (idx === -1) {
        invalidMiddleware.push(key);
        return
      }

      collected[key] = this.middlewares[idx].func
    })

    if (invalidMiddleware.length) {
      this.logger.error("Invalid Middleware keys found", invalidMiddleware.join(", "))
      return null;
    }

    return collected
  }
}
