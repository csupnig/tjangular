'use strict';

class MockProvider {
    public static MOCK_MODULE_NAME : string = 'TJangularMocks';
    public static MOCK_PREFIX : string = 'TJ__';
    public static LOGS_ENABLED : boolean = false;

    private static MOCKS : Array<MockDescriptor> = [];

    public static getTestObject<T>(descriptor : ProviderDescriptor, moduledependencies : Array<string>, unmockeddeps : Array<string>) : T {
        let allModules : Array<string> = ['ngMock', MockProvider.MOCK_MODULE_NAME].concat(moduledependencies);
        let injector : angular.auto.IInjectorService = angular.injector(allModules);
        let moduleObject : any = angular.module(descriptor.moduleName ? descriptor.moduleName : MockProvider.MOCK_MODULE_NAME);
        let invokeQueue : Array<any> = moduleObject._invokeQueue;
        let providerType : string = MockProvider.getProviderType(descriptor.providerName, invokeQueue);
        let preparedDeps : any = {};

        if (angular.isDefined(descriptor.dependencies)) {
            allModules = allModules.concat(descriptor.dependencies);
        }

        angular.forEach(allModules || [], (moduleName : string) => {
            invokeQueue = invokeQueue.concat((<any> angular.module(moduleName))._invokeQueue);
        });

        angular.forEach(invokeQueue, (providerData : any) => {
            let currProviderName : string = providerData[2][0];

            if (currProviderName === descriptor.providerName) {
                let currProviderDeps : any = providerData[2][1];

                if (angular.isFunction(currProviderDeps)) {
                    currProviderDeps = currProviderDeps.$inject || injector.annotate(currProviderDeps);
                }

                for (var i = 0; i < currProviderDeps.length; i++) {
                    if (!angular.isFunction(currProviderDeps[i])) {
                        let depName : string = currProviderDeps[i];
                        preparedDeps[depName] = MockProvider.getMockForProvider(injector, depName, descriptor, unmockeddeps, currProviderDeps, i);
                    }
                }
            }
        });

        let provider : any = MockProvider.initializeProvider<T>(injector, providerType, descriptor, preparedDeps);

        angular.forEach(invokeQueue, (providerData : any) => {
            MockProvider.sanitizeProvider(providerData, injector);
        });

        provider.$deps = preparedDeps;
        return provider;
    }

    public static registerModuleDependency(instance : any, dep : string | Array<string>) : void {
        if (!angular.isDefined(dep)) {
            return;
        }
        if (!angular.isDefined(instance.$moduledependencies)) {
            instance.$moduledependencies = [];
        }
        if (angular.isArray(dep)) {
            angular.forEach(dep, (singleDep : string) => {
                if (instance.$moduledependencies.indexOf(singleDep) < 0) {
                    instance.$moduledependencies.push(singleDep);
                }
            });
        } else {
            if (instance.$moduledependencies.indexOf(dep) < 0) {
                instance.$moduledependencies.push(dep);
            }
        }
    }

    public static initMocks() : void {
        let module : any;

        try {
            module = angular.module(MockProvider.MOCK_MODULE_NAME);
        } catch (err) {
            module = angular.module(MockProvider.MOCK_MODULE_NAME, []);
        }

        angular.forEach(MockProvider.MOCKS, (descriptor : MockDescriptor) => {
            module[descriptor.providerType](MockProvider.MOCK_PREFIX + descriptor.providerName, descriptor.mock);
        });
    }

    public static createTest(target : any, name : string, propertyKey : string, itMethod : (key : string, fn : Function) => void) : void {
        if (!angular.isDefined(target.$tests)) {
            target.$tests = [];
        }
        let testname : string = name ? name : propertyKey;
        target[propertyKey].$testname = testname;
        target.$tests.push(new TestDescriptor(testname, propertyKey, itMethod));
    }

    public static createSpec(target : any, className : string, describeMethod : (key : string, fn : Function) => void) : void {
        let instance : any = new (Function.prototype.bind.apply(target));
        className = className ? className : target.name;

        describeMethod(className, () => {
            beforeEach(() => {
                let unmocked : Array<string> = [];

                MockProvider.initMocks();
                angular.forEach(instance.$injects, (descriptor : ProviderDescriptor) => {
                    MockProvider.registerModuleDependency(instance, descriptor.moduleName);

                    if (angular.isDefined(descriptor.dependencies)) {
                        MockProvider.registerModuleDependency(instance, descriptor.dependencies);
                    }

                    if (!descriptor.mock) {
                        unmocked.push(descriptor.providerName);
                    }
                });

                angular.forEach(instance.$injects, (descriptor : ProviderDescriptor) => {
                    instance[descriptor.propertyKey] = MockProvider.getTestObject(descriptor, instance.$moduledependencies, unmocked);
                });

                angular.forEach(instance.$before, (methodDescriptor : MethodDescriptor) => {
                    instance[methodDescriptor.propertyKey]();
                });
            });

            angular.forEach(instance.$tests, (testdescriptor : TestDescriptor) => {
                testdescriptor.itMethod(testdescriptor.testname, () => {
                    instance[testdescriptor.propertyKey].call(instance);
                });
            });
        });
    }

    public static registerMock(mock : any, providerName : string, providerType : string) : void {
        MockProvider.MOCKS.push(new MockDescriptor(mock, providerName, providerType));
    }

    private static sanitizeProvider(providerData : any, injector : angular.auto.IInjectorService) : void {
        if (angular.isString(providerData[2][0]) && providerData[2][0].indexOf(MockProvider.MOCK_PREFIX) === -1) {
            if (angular.isFunction(providerData[2][1])) {
                // provider declaration function has been provided without the array annotation,
                // so we need to annotate it so the invokeQueue can be prefixed
                let annotatedDependencies : any = injector.annotate(providerData[2][1]);

                delete providerData[2][1].$inject;
                annotatedDependencies.push(providerData[2][1]);
                providerData[2][1] = annotatedDependencies;
            }
            let currProviderDeps : any = providerData[2][1];

            if (angular.isArray(currProviderDeps)) {
                for (var i = 0; i < currProviderDeps.length - 1; i++) {
                    if (currProviderDeps[i].indexOf(MockProvider.MOCK_PREFIX) === 0) {
                        currProviderDeps[i] = currProviderDeps[i].replace(MockProvider.MOCK_PREFIX, "");
                    }
                }
            }
        }
    }

    private static log(...args : any[]) : void {
        if (MockProvider.LOGS_ENABLED) {
            console.log.apply(null, args);
        }
    }

    private static initializeProvider<T>(injector : angular.auto.IInjectorService, providerType : string, descriptor : ProviderDescriptor, preparedDeps : any) : T {
        let providerName : string = descriptor.providerName;

        if (descriptor.mock) {
            providerName = MockProvider.MOCK_PREFIX + providerName;
        }

        switch (providerType) {
            case 'controller':
                let $controller = <angular.IControllerService> injector.get('$controller');
                return <T> $controller(providerName, preparedDeps);
            default:
                return <T> injector.get(providerName);
        }
    }

    private static getMockForProvider(injector : angular.auto.IInjectorService,
                                      dependencyName : string,
                                      descriptor : ProviderDescriptor,
                                      unmockeddeps : Array<string>,
                                      currProviderDeps : any,
                                      i : number) : any {
        if (angular.isDefined(descriptor.mocks[dependencyName])) {
            MockProvider.log('Found provided mock: ' + dependencyName);
            return descriptor.mocks[dependencyName];
        } else {
            if (unmockeddeps.indexOf(dependencyName) < 0 && injector.has(MockProvider.MOCK_PREFIX + dependencyName)) {
                MockProvider.log('Found mock in mock module: ' + dependencyName);
                currProviderDeps[i] = MockProvider.MOCK_PREFIX + dependencyName;
                return injector.get(MockProvider.MOCK_PREFIX + dependencyName);
            } else {
                MockProvider.log('Using unmocked for: ' + dependencyName);
                return injector.get(dependencyName);
            }
        }
    }

    private static getProviderType(providerName : string, invokeQueue : Array<any>) : string {
        for (let i = 0; i < invokeQueue.length; i++) {
            let providerInfo = invokeQueue[i];

            if (providerInfo[2][0] === providerName) {
                switch (providerInfo[0]) {
                    case '$provide':
                        return providerInfo[1];
                    case '$controllerProvider':
                        return 'controller';
                    case '$compileProvider':
                        return 'directive';
                    case '$filterProvider':
                        return 'filter';
                    case '$animateProvider':
                        return 'animation';
                }
            }
        }
        return null;
    }
}

class ProviderDescriptor {
    public mocks : any = {};
    public moduleName : string;
    public providerName : string;
    public dependencies : Array<string>;
    public mock : boolean = false;
    constructor(public propertyKey : string) {}
}

class MockDescriptor {
    constructor(public mock : any, public providerName : string, public providerType : string) {}
}

class TestDescriptor {
    constructor(public testname : string, public propertyKey : string, public itMethod : (key : string, fn : Function) => void) {}
}

class MethodDescriptor {
    constructor(public target : any, public propertyKey : string) {}
}

export function Spec(classname? : string) : (target : any) => void {
    "use strict";

    return (target : any) => {
        MockProvider.createSpec(target, classname, describe);
    };
}

export function XSpec(classname? : string) : (target : any) => void {
    "use strict";

    return (target : any) => {
        MockProvider.createSpec(target, classname, xdescribe);
    };
}

export function FSpec(classname? : string) : (target : any) => void {
    "use strict";

    return (target : any) => {
        MockProvider.createSpec(target, classname, fdescribe);
    };
}

export function Mocks(mocks : any) : (target : any, propertyKey : string) => void {
    "use strict";

    return (target : any, propertyKey : string) => {
        if (!angular.isDefined(target.$injects)) {
            target.$injects = [];
        }
        let descriptor : ProviderDescriptor = undefined;
        angular.forEach(target.$injects, (desc : ProviderDescriptor) => {
            if (desc.propertyKey === propertyKey) {
                descriptor = desc;
            }
        });
        if (!angular.isDefined(descriptor)) {
            descriptor = new ProviderDescriptor(propertyKey);
        }
        descriptor.mocks = mocks;
        target.$injects.push(descriptor);
    };
}

export function Inject(providerName : string, moduleName : string, dependencies? : Array<string>) : (target : any, propertyKey : string) => void {
    "use strict";

    return (target : any, propertyKey : string) => {
        if (!angular.isDefined(target.$injects)) {
            target.$injects = [];
        }
        let descriptor : ProviderDescriptor = undefined;
        angular.forEach(target.$injects, (desc : ProviderDescriptor) => {
            if (desc.propertyKey === propertyKey) {
                descriptor = desc;
            }
        });
        if (!angular.isDefined(descriptor)) {
            descriptor = new ProviderDescriptor(propertyKey);
        }
        descriptor.dependencies = dependencies;
        descriptor.moduleName = moduleName;
        descriptor.providerName = providerName;
        target.$injects.push(descriptor);
    };
}

export function InjectMock(providerName : string) : (target : any, propertyKey : string) => void {
    "use strict";

    return (target : any, propertyKey : string) => {
        if (!angular.isDefined(target.$injects)) {
            target.$injects = [];
        }
        let descriptor : ProviderDescriptor = undefined;
        angular.forEach(target.$injects, (desc : ProviderDescriptor) => {
            if (desc.propertyKey === propertyKey) {
                descriptor = desc;
            }
        });
        if (!angular.isDefined(descriptor)) {
            descriptor = new ProviderDescriptor(propertyKey);
        }
        descriptor.mock = true;
        descriptor.providerName = providerName;
        target.$injects.push(descriptor);
    };
}

export function Test(name? : string) : (target : any, propertyKey : string) => void {
    "use strict";

    return (target : any, propertyKey : string) => {
        MockProvider.createTest(target, name, propertyKey, it);
    };
}

export function XTest(name? : string) : (target : any, propertyKey : string) => void {
    "use strict";

    return (target : any, propertyKey : string) => {
        MockProvider.createTest(target, name, propertyKey, xit);
    };
}

export function FTest(name? : string) : (target : any, propertyKey : string) => void {
    "use strict";

    return (target : any, propertyKey : string) => {
        MockProvider.createTest(target, name, propertyKey, fit);
    };
}

export function Before() : (target : any, propertyKey : string) => void {
    "use strict";

    return (target : any, propertyKey : string) => {
        if (!angular.isDefined(target.$before)) {
            target.$before = [];
        }
        target.$before.push(new MethodDescriptor(target, propertyKey));
    };
}

export function ProvideMock(providerName : string, providerType : string) : (target : any) => void {
    "use strict";

    return (target : any) => {
        MockProvider.registerMock(target, providerName, providerType);
    };
}

export function ProvideMockService(providerName : string) : (target : any) => void {
    "use strict";

    return (target : any) => {
        MockProvider.registerMock(target, providerName, 'service');
    };
}

export function ProvideMockProvider(providerName : string) : (target : any) => void {
    "use strict";

    return (target : any) => {
        MockProvider.registerMock(target, providerName, 'provider');
    };
}

export function ProvideMockController(providerName : string) : (target : any) => void {
    "use strict";

    return (target : any) => {
        MockProvider.registerMock(target, providerName, 'controller');
    };
}

export function ProvideMockDirective(providerName : string) : (target : any) => void {
    "use strict";

    return (target : any) => {
        MockProvider.registerMock(target, providerName, 'directive');
    };
}

export function ProvideMockValue(providerName : string) : (target : any) => void {
    "use strict";

    return (target : any) => {
        MockProvider.registerMock(target, providerName, 'value');
    };
}

export function ProvideMockConstant(providerName : string) : (target : any) => void {
    "use strict";

    return (target : any) => {
        MockProvider.registerMock(target, providerName, 'constant');
    };
}
