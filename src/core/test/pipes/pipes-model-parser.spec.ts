import * as sinon from "sinon";
import { expect } from "chai";
import { PipesModelParser } from "./../../pipes/pipes-model-parser";
import { ArgumentMetadata } from "@nestjs/common";

class TestModel {
  constructor(public prop1: string, public prop2: number) {}
}

describe("PipesModelParser", () => {
  let target: PipesModelParser;
  let testModel;
  beforeEach(() => {
    target = new PipesModelParser();
  });
  describe("transform", () => {
    describe("when metadata is empty or undefined", () => {
      it("should return the value unchanged", async () => {
        const testObj = { prop1: "value1", prop2: "value2" };
        expect(await target.transform(testObj, {} as any)).to.equal(testObj);
        expect(await target.transform(testObj, {} as any)).to.not.be.instanceOf(
          TestModel
        );
      });
    });
    describe("when metadata contains a class", () => {
      const metadata: ArgumentMetadata = {
        type: "body",
        metatype: TestModel,
        data: ""
      };
      it("should return an instance of the class", async () => {
        const testObj = { prop1: "value1", prop2: "value2" };
        const result = await target.transform(testObj, metadata);
        expect(result).to.be.instanceOf(TestModel);
      });
    });
  });
});
