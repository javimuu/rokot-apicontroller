import {Shared,ApiControllerExplorer} from "../shared";
import * as _ from "underscore";
import {MetadataKeys, controllerRegistry, middlewareRegistry} from "../decorators";
import {Logger} from "bunyan";
import {IApiControllerRoute,IApiControllerRouteVerb, IApiController,IApiControllerCompiler, IApi, IApiControllerClassConstructor, IApiControllerClass} from "../core";
interface IGroup {
  key: string;
  route: IApiControllerRoute;
  routeVerb: IApiControllerRouteVerb;
  controller: IApiController
}

export class RuntimeControllerMetadataCompiler implements IApiControllerCompiler {
  constructor(protected logger: Logger, private controllerConstructor?: IApiControllerClassConstructor){
  }
  private errors: string[] = [];
  protected onError(message: string){
    this.errors.push(message);
    this.logger.error(message)
  }

  protected reset(){
    this.errors = []
  }

  protected postCompile(api: IApi){}

  compile(): IApi {
    this.reset();
    this.logger.trace(`Runtime Compile started`)
    let controllers = controllerRegistry.toValueArray().map(t => this.buildApiController(t)).filter(b => !!b);
    const api = { controllers, errors: this.errors } as IApi;
    this.validate(api);
    this.postCompile(api);
    this.logger.trace(`Runtime Compile completed`)
    return api;
  }

  private validate(api: IApi) {
    const groups: IGroup[] = []
    ApiControllerExplorer.forEachControllerRoute(api.controllers, (controller, route) =>{
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

    const invalidMiddleware: string[]=[]
    const keys = ApiControllerExplorer.getAllMiddlewareKeys(api.controllers);
    var mws = middlewareRegistry.asDictionary();
    keys.forEach(key => {
      if (!mws[key]) {
        this.onError(`Missing middleware key '${key}'`);
      }
    })
  }

  private buildApiController(controllerClass: IApiControllerClass): IApiController {
    const controllerMiddlewareKeys: string[] = Reflect.getMetadata(MetadataKeys.middlewareKeys, controllerClass)
    const routePrefix: string = Reflect.getMetadata(MetadataKeys.routePrefix, controllerClass)
    const controllerName: string = Reflect.getMetadata(MetadataKeys.controller, controllerClass)
    const routes: IApiControllerRoute[] = []
    this.logger.trace(`Processing ${controllerName}`)
    for (var memberName in controllerClass) {
      this.logger.trace(`+ ${memberName}`)
      routes.push(this.buildApiControllerRoute(controllerClass, memberName, routePrefix, controllerName, controllerMiddlewareKeys));
    }

    const instance = Shared.construct(controllerClass, controllerName, this.controllerConstructor);
    const ks = _.uniq(_.keys(instance).concat(_.keys(controllerClass.prototype)));
    ks.forEach(memberName => {
      const value = instance[memberName];
      if (!value || !_.isFunction(value)) {
        this.logger.trace(`- ${memberName} (ignored)`)
        return;
      }
      this.logger.trace(`- ${memberName}`)
      routes.push(this.buildApiControllerRoute(controllerClass.prototype, memberName, routePrefix, controllerName, controllerMiddlewareKeys));
    })
    if (!routes.length) {
      this.logger.trace(`> no routes found (ignored)`)
      return;
    }
    return { name: controllerName, routes, controllerClass };
  }

  private buildApiControllerRoute(target: Object, memberName: string, routePrefix: string, controllerName: string, controllerMiddlewareKeys: string[]): IApiControllerRoute {
    const memberRoute = Reflect.getMetadata(MetadataKeys.route, target, memberName) || Shared.defaultRoute()
    const middlewareKeys = Reflect.getMetadata(MetadataKeys.middlewareKeys, target, memberName) || Shared.defaultMiddleware()
    const acceptVerbs = Reflect.getMetadata(MetadataKeys.acceptVerbs, target, memberName) || Shared.defaultVerbs(memberName)
    const name = Shared.makeRouteName(controllerName, memberName);
    const route = Shared.makeRoute(routePrefix, memberRoute);
    const routeVerbs = Shared.makeRouteVerbs(acceptVerbs, route);
    routeVerbs.forEach(rv => {
      this.logger.trace(`-- (${rv.verb}: ${rv.route})`)
    })
    let middlewares: string[];
    if (controllerMiddlewareKeys) {
      if (middlewareKeys) {
        middlewares = controllerMiddlewareKeys.concat(middlewareKeys);
      } else{
        middlewares = controllerMiddlewareKeys;
      }
    } else{
      middlewares = middlewareKeys;
    }
    const cr = {
      name,
      memberName,
      routeVerbs,
      middlewares
    };
    this.postApiControllerRoute(controllerName, cr)
    return cr;
  }

  protected postApiControllerRoute(controllerName: string, route: IApiControllerRoute){
  }
}
