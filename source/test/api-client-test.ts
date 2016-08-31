import {expect,sinon,supertest,chai} from "rokot-test";
import * as _ from "underscore";
import {ConsoleLogger,Logger} from "rokot-log";
import {ApiClientBuilder} from "../client/apiClientBuilder";
import {ApiBuilder} from "../server/apiBuilder";
import {expressClientWriter} from "../express/clientWriter";
import {FileStreamWriter} from "../fileStreamWriter";
import {apiControllers,middlewareFunctions} from "../decorators";
import "./testControllers";
import "./testMiddleware";

const logger = ConsoleLogger.create("api-client-test",{level:"trace"});

describe("Api Client", () => {
  it("should build client routes to match the Api", () => {
    const apiBuilder = new ApiBuilder(logger);
    const workingOnly = apiControllers.filter(a => a.name === "MiddlewareController" || a.name === "SimpleController" || a.name === "NoVerbsRouteController")
    const api = apiBuilder.build(workingOnly, middlewareFunctions)
    expect(api.errors).to.be.undefined
    expect(api.controllers).to.not.be.undefined
    expect(api.controllers.length).to.eq(3)

    expect(FileStreamWriter.write("./out/api.json", stream => {
      stream.write(JSON.stringify(api, null, 2))
    })).eventually.fulfilled

    const apiClientBuilder = new ApiClientBuilder(logger)
    const apiClient = apiClientBuilder.build(["./source/test/testControllers.ts"], api)

    expect(apiClient.controllers.length).to.eq(api.controllers.length)
    apiClient.controllers.forEach((c, i) => {
      const controller = api.controllers[i]
      expect(c.typeName).to.eq(controller.name)
      expect(c.routes.length).to.eq(controller.routes.length)
    })
    expect(FileStreamWriter.write("./out/apiClient.json", stream => {
      stream.write(JSON.stringify(apiClient, null, 2))
    })).eventually.fulfilled

    expect(expressClientWriter("./out/client.ts", apiClient)).eventually.fulfilled
  })
})
