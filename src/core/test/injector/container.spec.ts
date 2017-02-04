import { expect } from "chai";
import { NestContainer, ModuleDependencies, InstanceWrapper } from "../../injector/container";
import { Module } from "../../../common/utils/module.decorator";
import { Injectable } from "../../../common/interfaces/injectable.interface";
import { Controller } from "../../../common/interfaces/controller.interface";
import { UnkownExportException } from "../../../errors/exceptions/unkown-export.exception";

describe('NestContainer', () => {
    let container: NestContainer;

    @Module({})
    class TestModule {}

    beforeEach(() => {
        container = new NestContainer();
    });

    it('should create module instance and collections for dependencies', () => {
        container.addModule(TestModule);

        expect(container["modules"].get(TestModule)).to.be.deep.equal({
            instance: new TestModule(),
            relatedModules: new Set<ModuleDependencies>(),
            components: new Map<Injectable, InstanceWrapper<any>>(),
            routes: new Map<Controller, InstanceWrapper<Controller>>(),
            exports: new Set<Injectable>(),
        })
    });


    it('should throw "UnkownExportException" when given exported component is not a part of components array', () => {
        container.addModule(TestModule);

        expect(
            container.addExportedComponent.bind(container, <any>"Test", TestModule)
        ).throws(UnkownExportException);
    });

});