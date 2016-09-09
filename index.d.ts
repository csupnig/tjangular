export declare function Spec(classname?: string): (target: any) => void;
export declare function XSpec(classname?: string): (target: any) => void;
export declare function FSpec(classname?: string): (target: any) => void;
export declare function Mocks(mocks: any): (target: any, propertyKey: string) => void;
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
