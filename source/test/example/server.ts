import * as express from "express";
import * as bodyParser from "body-parser";
import * as http from "http";
import * as fs from "fs";
import "./controllers";
import "./middleware";
import {ExpressRouteBuilder} from "../../expressRouteBuilder";
import {RuntimeControllerMetadataCompiler} from "../../compilers/runtimeCompiler";
//import {SourceCodeControllerMetadataCompiler} from "../../compilers/sourceCodeCompiler";
import {Logger,ConsoleLogger} from "rokot-log";
import {middleware} from "../../decorators";
import {IApi, IApiControllerCompiler} from "../../core";
var logger = ConsoleLogger.create("test server", {level:"trace"})

class Server {
  static logRoutes(api: IApi, logger: Logger) {
    api.controllers.forEach(c => {
      logger.info("Controller: ", c.name);
      c.routes.forEach(r => {
        r.routeVerbs.forEach(rv => {
          logger.info(` - ${rv.route} (${rv.verb})${r.middlewares ? " => " : ""}${r.middlewares ? r.middlewares.join(", ") : ""}`)
        })
      })
    })
  }

  static init(api: IApi) {
    var app = express();
    app.use(express.static('static'));
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    this.logRoutes(api, logger);
    const builder = new ExpressRouteBuilder(logger, app);
    const built = builder.build(api);
    if (!built) {
      console.log("Unable to build express routes - Service stopping!")
      return;
    }

    var server = http.createServer(app).listen(3000, (err) => {
      if (err) throw err

      var add = server.address()
      console.log('Node API listening at http://%s:%s - %s', add.address, add.port, add.family);
    });
  }
}

function compile(name: string, compiler: IApiControllerCompiler) {
  const compiled = compiler.compile();
  fs.writeFileSync(name, JSON.stringify(compiled, null, 2))
  return compiled;
}

export class Boot{
  static run(){
    const reflectCompiler = new RuntimeControllerMetadataCompiler(logger)
    const reflected = reflectCompiler.compile();
    if (reflected.errors.length) {
      console.log("Unable to start express service - errors found during api controller compilation!")
    } else{
      Server.init(reflected);
    }
  }
}
