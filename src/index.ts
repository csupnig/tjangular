
export class MockProvider {
    public static MOCK_MODULE_NAME : string = 'TJangularMocks';
    public static MOCK_PREFIX : string = 'TJ__';
    public static LOGS_ENABLED : boolean = false;
    public static PROMISE_SERVICES : Array<string> = ['$q', '$rootScope', '$timeout', '$interval'];

    private static MOCKS : Array<MockDescriptor> = [];

    public static getTestObject<T>(injector : angular.auto.IInjectorService, invokeQueue : Array<any>, descriptor : ProviderDescriptor, unmockeddeps : Array<string>) : T {
        let preparedDeps : any = {};
        let objectDependencies : Array<string> = [];
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
                        if (depName.indexOf(MockProvider.MOCK_PREFIX) > -1) {
                            let provideName : string = depName.replace(MockProvider.MOCK_PREFIX, "");
                            preparedDeps[provideName] = MockProvider.getMockForProvider(injector, depName, descriptor);
                            objectDependencies.push(provideName + ' (mocked)');
                        } else {
                            preparedDeps[depName] = MockProvider.getMockForProvider(injector, depName, descriptor);
                            objectDependencies.push(depName);
                        }
                    }
                }
            }
        });
        let providerType : string = MockProvider.getProviderType(descriptor.providerName, invokeQueue);
        let provider : any = MockProvider.initializeProvider<T>(injector, injector, providerType, descriptor, preparedDeps);
        MockProvider.log('Providing dependencies for ' + descriptor.providerName + ' as .$deps', objectDependencies);
        provider.$deps = preparedDeps;
        return provider;
    }

    public static getInvokerQueue(moduledependencies : Array<string>) : Array<any> {
        let invokeQueue : Array<any> = [];
        angular.forEach(moduledependencies || [], (moduleName : string) => {
            invokeQueue = invokeQueue.concat((<any> angular.module(moduleName))._invokeQueue);
        });

        return invokeQueue;
    }

    public static prepareModuleDependencyDescriptors<T>(injector : angular.auto.IInjectorService,
                                                        invokeQueue : Array<any>,
                                                        descriptor : ProviderDescriptor,
                                                        unmockeddeps : Array<string>) : void {

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
                        if (unmockeddeps.indexOf(depName) < 0 && injector.has(MockProvider.MOCK_PREFIX + depName)) {
                            MockProvider.log('Found mock in mock module => rewriting module dep: ' + depName);
                            currProviderDeps[i] = MockProvider.MOCK_PREFIX + depName;
                        }
                    }
                }
            }
        });
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
                let injector : angular.auto.IInjectorService;
                let allModules : Array<string> = [];
                let invokeQueue : Array<any>;

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
                allModules = ['ngMock', MockProvider.MOCK_MODULE_NAME].concat(instance.$moduledependencies);
                injector = angular.injector(allModules);
                invokeQueue = MockProvider.getInvokerQueue(instance.$moduledependencies);
                // Prepare module dependency descriptors
                angular.forEach(instance.$injects, (descriptor : ProviderDescriptor) => {
                    MockProvider.prepareModuleDependencyDescriptors(injector, invokeQueue, descriptor, unmocked);
                });
                // Clean Injector cache
                injector = angular.injector(allModules);

                // Inject pending injects
                angular.forEach(instance.$injects, (descriptor : ProviderDescriptor) => {
                    instance[descriptor.propertyKey] = MockProvider.getTestObject(injector, invokeQueue, descriptor, unmocked);
                });

                // Clean module dependency descriptors
                angular.forEach(invokeQueue, (providerData : any) => {
                    MockProvider.sanitizeProvider(providerData, injector);
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

    private static initializeProvider<T>(promiseInjector : angular.auto.IInjectorService,
                                         injector : angular.auto.IInjectorService,
                                         providerType : string,
                                         descriptor : ProviderDescriptor,
                                         preparedDeps : any) : T | angular.IAugmentedJQuery {
        let providerName : string = descriptor.providerName;

        if (descriptor.mock) {
            providerName = MockProvider.MOCK_PREFIX + providerName;
        }

        if (MockProvider.PROMISE_SERVICES.indexOf(providerName) > -1) {
            return <T> promiseInjector.get(providerName);
        }

        switch (providerType) {
            case 'controller':
                let $controller = <angular.IControllerService> injector.get('$controller');
                return <T> $controller(providerName, preparedDeps);
            case 'directive':
                return MockProvider.createDirective(injector, descriptor, preparedDeps);
            default:
                return <T> promiseInjector.get(providerName);
        }
    }

    private static createDirective(injector : angular.auto.IInjectorService, descriptor : ProviderDescriptor, preparedDeps : any) : angular.IAugmentedJQuery {
        MockProvider.log('Creating directive ' + descriptor.providerName);
        let $rootScope : angular.IRootScopeService = <angular.IRootScopeService> injector.get('$rootScope');
        let $compile : angular.ICompileService = <angular.ICompileService> injector.get('$compile');
        if (!angular.isDefined(descriptor.template)) {
            console.error('Injected directives need a template to reside in. Add it via @Template() to the injectable. e.g. <div data-' + descriptor.providerName + '></div>.');
            throw new Error('Injected directives need a template to reside in. Add it via @Template() to the injectable. e.g. <div data-' + descriptor.providerName + '></div>.');
        }
        let template : string = descriptor.template;
        let element : angular.IAugmentedJQuery = angular.element(template);
        preparedDeps['$scope'] = MockProvider.createScope(injector, descriptor);
        element = $compile(template)(preparedDeps['$scope']);
        $rootScope.$apply();
        return element;
    }

    private static getMockForProvider(injector : angular.auto.IInjectorService,
                                      dependencyName : string,
                                      descriptor : ProviderDescriptor) : any {
        if (angular.isDefined(descriptor.mocks[dependencyName])) {
            MockProvider.log('Found provided mock: ' + dependencyName);
            return descriptor.mocks[dependencyName];
        } else if (dependencyName === '$scope' && angular.isDefined(descriptor.scope)) {
            return MockProvider.createScope(injector, descriptor);
        } else {
            return injector.get(dependencyName);
        }
    }

    private static createScope(injector : angular.auto.IInjectorService, descriptor : ProviderDescriptor) : any {
        let $rootScope : angular.IRootScopeService = <angular.IRootScopeService> injector.get('$rootScope');
        let $scope : any = $rootScope.$new();
        angular.extend($scope, descriptor.scope);
        return $scope;
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

export class ProviderDescriptor {
    public scope : any;
    public mocks : any = {};
    public moduleName : string;
    public providerName : string;
    public dependencies : Array<string>;
    public mock : boolean = false;
    public template : string;
    constructor(public propertyKey : string) {}
}

class MockDescriptor {
    constructor(public mock : any, public providerName : string, public providerType : string) {}
}

class TestDescriptor {
    constructor(public testname : string, public propertyKey : string, public itMethod : (key : string, fn : Function) => void) {}
}

export class MethodDescriptor {
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

export function Scope(scope : any) : (target : any, propertyKey : string) => void {
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
        descriptor.scope = scope;
        target.$injects.push(descriptor);
    };
}

export function Template(template : string) : (target : any, propertyKey : string) => void {
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
        descriptor.template = template;
        target.$injects.push(descriptor);
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

