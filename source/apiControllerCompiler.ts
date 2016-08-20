import {Shared,ApiControllerExplorer} from "./shared";
import * as _ from "underscore";
import {Logger} from "bunyan";
import {IApiControllerRoute,IMiddewareFunction,IApiControllerRouteVerb, IApiController,IApiControllerCompiler, IApi,INewableConstructor, INewableApiController} from "./core";

interface IGroup {
  key: string;
  route: IApiControllerRoute;
  routeVerb: IApiControllerRouteVerb;
  controller: IApiController
}

export class ApiControllerCompiler implements IApiControllerCompiler {
  constructor(protected logger: Logger, private controllerConstructor?: INewableConstructor<INewableApiController, IApiController>){
  }
  private errors: string[] = [];
  protected onError(message: string){
    this.errors.push(message);
    this.logger.error(message)
  }

  protected reset(){
    this.errors = []
  }

  compile(apiControllers: IApiController[], middlewareKeys: string[]): IApi {
    this.reset();
    this.logger.trace(`Runtime Compile started`)
    let controllers = apiControllers.filter(t => this.validateApiControllerRoutes(t));
    const api = { controllers, errors: this.errors } as IApi;
    this.validate(controllers, middlewareKeys);
    this.logger.trace(`Runtime Compile completed`)
    return api;
  }

  private validate(apiControllers: IApiController[], middlewareKeys: string[]) {
    const groups: IGroup[] = []
    ApiControllerExplorer.forEachControllerRoute(apiControllers, (controller, route) =>{
      route.routeVerbs.forEach(routeVerb => {
        groups.push({ key: `${routeVerb.route}|${routeVerb.verb}`, route, controller, routeVerb });
      });
    })

    var g = _.groupBy(groups, g => g.key);
    for (const member in g) {
      const members = g[member];
      if (members.length > 1) {
        this.onError(`Duplicate route (${members[0].routeVerb.verb}: ${members[0].routeVerb.route}) found for ${members.map(m => `${m.controller.name}.${m.route.memberName}`).join(",") }`);
      }
    }

    // const invalidMiddleware: string[]=[]
    const keys = ApiControllerExplorer.getAllMiddlewareKeys(apiControllers);
    keys.forEach(key => {
      if (middlewareKeys.indexOf(key) === -1) {
        this.onError(`Missing middleware key '${key}'`);
      }
    })
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
      this.logger.trace(`- ${r.memberName} ${r.routeVerbs.map(rv => `[${rv.verb}] ${rv.route}`).join(",")}`)
    })
    if (!routes || !routes.length) {
      this.logger.trace(`> no routes found (ignored)`)
      return false;
    }
    return true;
  }
}
