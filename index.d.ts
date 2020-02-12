export declare class MockProvider {
    static MOCK_MODULE_NAME: string;
    static MOCK_PREFIX: string;
    static LOGS_ENABLED: boolean;
    static PROMISE_SERVICES: Array<string>;
    private static MOCKS;
    static getTestObject<T>(injector: angular.auto.IInjectorService, invokeQueue: Array<any>, descriptor: ProviderDescriptor, unmockeddeps: Array<string>): T;
    static getInvokerQueue(moduledependencies: Array<string>): Array<any>;
    static prepareModuleDependencyDescriptors<T>(injector: angular.auto.IInjectorService, invokeQueue: Array<any>, descriptor: ProviderDescriptor, unmockeddeps: Array<string>): void;
    static registerModuleDependency(instance: any, dep: string | Array<string>): void;
    static initMocks(): void;
    static createTest(target: any, name: string, propertyKey: string, itMethod: (key: string, fn: Function) => void): void;
    static createSpec(target: any, className: string, describeMethod: (key: string, fn: Function) => void): void;
    static registerMock(mock: any, providerName: string, providerType: string): void;
    private static sanitizeProvider(providerData, injector);
    private static log(...args);
    private static initializeProvider<T>(promiseInjector, injector, providerType, descriptor, preparedDeps);
    private static createDirective(injector, descriptor, preparedDeps);
    private static getMockForProvider(injector, dependencyName, descriptor);
    private static createScope(injector, descriptor);
    private static getProviderType(providerName, invokeQueue);
}
export declare class ProviderDescriptor {
    propertyKey: string;
    scope: any;
    mocks: any;
    moduleName: string;
    providerName: string;
    dependencies: Array<string>;
    mock: boolean;
    template: string;
    attachTemplateToBody: boolean;
    beforeInject: (deps: any) => void;
    constructor(propertyKey: string);
}
export declare class MethodDescriptor {
    target: any;
    propertyKey: string;
    constructor(target: any, propertyKey: string);
}
export declare function Spec(classname?: string): (target: any) => void;
export declare function XSpec(classname?: string): (target: any) => void;
export declare function FSpec(classname?: string): (target: any) => void;
export declare function Scope(scope: any): (target: any, propertyKey: string) => void;
export declare function Template(template: string, attachToBody?: boolean): (target: any, propertyKey: string) => void;
export declare function Mocks(mocks: any): (target: any, propertyKey: string) => void;
export declare function BeforeInject(fn: (deps: any) => void): (target: any, propertyKey: string) => void;
export declare function Inject(providerName: string, moduleName: string, dependencies?: Array<string>): (target: any, propertyKey: string) => void;
export declare function InjectMock(providerName: string): (target: any, propertyKey: string) => void;
export declare function Test(name?: string): (target: any, propertyKey: string) => void;
export declare function XTest(name?: string): (target: any, propertyKey: string) => void;
export declare function FTest(name?: string): (target: any, propertyKey: string) => void;
export declare function Before(): (target: any, propertyKey: string) => void;
export declare function ProvideMock(providerName: string, providerType: string): (target: any) => void;
export declare function ProvideMockService(providerName: string): (target: any) => void;
export declare function ProvideMockProvider(providerName: string): (target: any) => void;
export declare function ProvideMockController(providerName: string): (target: any) => void;
export declare function ProvideMockDirective(providerName: string): (target: any) => void;
export declare function ProvideMockValue(providerName: string): (target: any) => void;
export declare function ProvideMockConstant(providerName: string): (target: any) => void;
