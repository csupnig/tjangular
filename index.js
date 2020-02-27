define(["require", "exports"], function (require, exports) {
    var MockProvider = (function () {
        function MockProvider() {
        }
        MockProvider.getTestObject = function (injector, invokeQueue, descriptor, unmockeddeps) {
            var preparedDeps = {};
            var objectDependencies = [];
            angular.forEach(invokeQueue, function (providerData) {
                var currProviderName = providerData[2][0];
                if (currProviderName === descriptor.providerName) {
                    var currProviderDeps = providerData[2][1];
                    if (angular.isFunction(currProviderDeps)) {
                        currProviderDeps = currProviderDeps.$inject || injector.annotate(currProviderDeps);
                    }
                    for (var i = 0; i < currProviderDeps.length; i++) {
                        if (!angular.isFunction(currProviderDeps[i])) {
                            var depName = currProviderDeps[i];
                            if (depName.indexOf(MockProvider.MOCK_PREFIX) > -1) {
                                var provideName = depName.replace(MockProvider.MOCK_PREFIX, "");
                                preparedDeps[provideName] = MockProvider.getMockForProvider(injector, depName, descriptor);
                                objectDependencies.push(provideName + ' (mocked)');
                            }
                            else {
                                preparedDeps[depName] = MockProvider.getMockForProvider(injector, depName, descriptor);
                                objectDependencies.push(depName);
                            }
                        }
                    }
                }
            });
            var providerType = MockProvider.getProviderType(descriptor.providerName, invokeQueue);
            var provider = MockProvider.initializeProvider(injector, injector, providerType, descriptor, preparedDeps, invokeQueue);
            MockProvider.log('Providing dependencies for ' + descriptor.providerName + ' as .$deps', objectDependencies);
            provider.$deps = preparedDeps;
            return provider;
        };
        MockProvider.getInvokerQueue = function (moduledependencies) {
            var invokeQueue = [];
            angular.forEach(moduledependencies || [], function (moduleName) {
                invokeQueue = invokeQueue.concat(angular.module(moduleName)._invokeQueue);
            });
            return invokeQueue;
        };
        MockProvider.prepareModuleDependencyDescriptors = function (injector, invokeQueue, descriptor, unmockeddeps) {
            angular.forEach(invokeQueue, function (providerData) {
                var currProviderName = providerData[2][0];
                if (currProviderName === descriptor.providerName) {
                    var currProviderDeps = providerData[2][1];
                    if (angular.isFunction(currProviderDeps)) {
                        currProviderDeps = currProviderDeps.$inject || injector.annotate(currProviderDeps);
                    }
                    for (var i = 0; i < currProviderDeps.length; i++) {
                        if (!angular.isFunction(currProviderDeps[i])) {
                            var depName = currProviderDeps[i];
                            if (unmockeddeps.indexOf(depName) < 0 && injector.has(MockProvider.MOCK_PREFIX + depName)) {
                                MockProvider.log('Found mock in mock module => rewriting module dep: ' + depName);
                                currProviderDeps[i] = MockProvider.MOCK_PREFIX + depName;
                            }
                        }
                    }
                }
            });
        };
        MockProvider.registerModuleDependency = function (instance, dep) {
            if (!angular.isDefined(dep)) {
                return;
            }
            if (!angular.isDefined(instance.$moduledependencies)) {
                instance.$moduledependencies = [];
            }
            if (angular.isArray(dep)) {
                angular.forEach(dep, function (singleDep) {
                    if (instance.$moduledependencies.indexOf(singleDep) < 0) {
                        instance.$moduledependencies.push(singleDep);
                    }
                });
            }
            else {
                if (instance.$moduledependencies.indexOf(dep) < 0) {
                    instance.$moduledependencies.push(dep);
                }
            }
        };
        MockProvider.initMocks = function () {
            var module;
            try {
                module = angular.module(MockProvider.MOCK_MODULE_NAME);
            }
            catch (err) {
                module = angular.module(MockProvider.MOCK_MODULE_NAME, []);
            }
            angular.forEach(MockProvider.MOCKS, function (descriptor) {
                module[descriptor.providerType](MockProvider.MOCK_PREFIX + descriptor.providerName, descriptor.mock);
            });
        };
        MockProvider.createTest = function (target, name, propertyKey, itMethod) {
            if (!angular.isDefined(target.$tests)) {
                target.$tests = [];
            }
            var testname = name ? name : propertyKey;
            target[propertyKey].$testname = testname;
            target.$tests.push(new TestDescriptor(testname, propertyKey, itMethod));
        };
        MockProvider.createSpec = function (target, className, describeMethod) {
            var instance = new (Function.prototype.bind.apply(target));
            className = className ? className : target.name;
            describeMethod(className, function () {
                beforeEach(function () {
                    var unmocked = [];
                    var injector;
                    var allModules = [];
                    var invokeQueue;
                    MockProvider.initMocks();
                    angular.forEach(instance.$injects, function (descriptor) {
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
                    angular.forEach(instance.$injects, function (descriptor) {
                        MockProvider.prepareModuleDependencyDescriptors(injector, invokeQueue, descriptor, unmocked);
                    });
                    // Clean Injector cache
                    injector = angular.injector(allModules);
                    // Inject pending injects
                    angular.forEach(instance.$injects, function (descriptor) {
                        instance[descriptor.propertyKey] = MockProvider.getTestObject(injector, invokeQueue, descriptor, unmocked);
                    });
                    // Clean module dependency descriptors
                    angular.forEach(invokeQueue, function (providerData) {
                        MockProvider.sanitizeProvider(providerData, injector);
                    });
                    angular.forEach(instance.$before, function (methodDescriptor) {
                        instance[methodDescriptor.propertyKey]();
                    });
                });
                angular.forEach(instance.$tests, function (testdescriptor) {
                    testdescriptor.itMethod(testdescriptor.testname, function () {
                        instance[testdescriptor.propertyKey].call(instance);
                    });
                });
            });
        };
        MockProvider.registerMock = function (mock, providerName, providerType) {
            MockProvider.MOCKS.push(new MockDescriptor(mock, providerName, providerType));
        };
        MockProvider.sanitizeProvider = function (providerData, injector) {
            if (angular.isString(providerData[2][0]) && providerData[2][0].indexOf(MockProvider.MOCK_PREFIX) === -1) {
                if (angular.isFunction(providerData[2][1])) {
                    // provider declaration function has been provided without the array annotation,
                    // so we need to annotate it so the invokeQueue can be prefixed
                    var annotatedDependencies = injector.annotate(providerData[2][1]);
                    delete providerData[2][1].$inject;
                    annotatedDependencies.push(providerData[2][1]);
                    providerData[2][1] = annotatedDependencies;
                }
                var currProviderDeps = providerData[2][1];
                if (angular.isArray(currProviderDeps)) {
                    for (var i = 0; i < currProviderDeps.length - 1; i++) {
                        if (currProviderDeps[i].indexOf(MockProvider.MOCK_PREFIX) === 0) {
                            currProviderDeps[i] = currProviderDeps[i].replace(MockProvider.MOCK_PREFIX, "");
                        }
                    }
                }
            }
        };
        MockProvider.log = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i - 0] = arguments[_i];
            }
            if (MockProvider.LOGS_ENABLED) {
                console.log.apply(null, args);
            }
        };
        MockProvider.initializeProvider = function (promiseInjector, injector, providerType, descriptor, preparedDeps, invokeQueue) {
            var providerName = descriptor.providerName;
            if (descriptor.mock) {
                providerName = MockProvider.MOCK_PREFIX + providerName;
            }
            if (MockProvider.PROMISE_SERVICES.indexOf(providerName) > -1) {
                return promiseInjector.get(providerName);
            }
            switch (providerType) {
                case 'controller':
                    var $controller = injector.get('$controller');
                    return $controller(providerName, preparedDeps);
                case 'directive':
                    return MockProvider.createDirective(injector, descriptor, preparedDeps, invokeQueue);
                default:
                    return promiseInjector.get(providerName);
            }
        };
        MockProvider.createDirective = function (injector, descriptor, preparedDeps, invokeQueue) {
            MockProvider.log('Creating directive ' + descriptor.providerName);
            if (descriptor.mockControllerDeps) {
                for (var i = 0; i < invokeQueue.length; i++) {
                    var providerInfo = invokeQueue[i];
                    if (providerInfo[2][0] === descriptor.providerName) {
                        if (providerInfo[2] && providerInfo[2][1] && providerInfo[2][1]['controller'] && providerInfo[2][1]['controller'].$inject) {
                            var controllerDeps = providerInfo[2][1]['controller'].$inject.map(function (dep) {
                                if (MockProvider.MOCKS.filter(function (mockProv) { return mockProv.providerName === dep; }).length > 0) {
                                    return MockProvider.MOCK_PREFIX + dep;
                                }
                                return dep;
                            });
                            providerInfo[2][1]['controller'].$inject = controllerDeps;
                        }
                    }
                }
            }
            var $rootScope = injector.get('$rootScope');
            var $compile = injector.get('$compile');
            if (!angular.isDefined(descriptor.template)) {
                console.error('Injected directives need a template to reside in. Add it via @Template() to the injectable. e.g. <div data-' + descriptor.providerName + '></div>.');
                throw new Error('Injected directives need a template to reside in. Add it via @Template() to the injectable. e.g. <div data-' + descriptor.providerName + '></div>.');
            }
            var template = descriptor.template;
            var element = angular.element(template);
            if (descriptor.attachTemplateToBody) {
                angular.element(document.body).append(element);
            }
            preparedDeps['$scope'] = MockProvider.createScope(injector, descriptor);
            element = $compile(element)(preparedDeps['$scope']);
            $rootScope.$apply();
            return element;
        };
        MockProvider.getMockForProvider = function (injector, dependencyName, descriptor) {
            if (angular.isDefined(descriptor.mocks[dependencyName])) {
                MockProvider.log('Found provided mock: ' + dependencyName);
                return descriptor.mocks[dependencyName];
            }
            else if (dependencyName === '$scope' && angular.isDefined(descriptor.scope)) {
                return MockProvider.createScope(injector, descriptor);
            }
            else {
                return injector.get(dependencyName);
            }
        };
        MockProvider.createScope = function (injector, descriptor) {
            var $rootScope = injector.get('$rootScope');
            var $scope = $rootScope.$new();
            angular.extend($scope, descriptor.scope);
            return $scope;
        };
        MockProvider.getProviderType = function (providerName, invokeQueue) {
            for (var i = 0; i < invokeQueue.length; i++) {
                var providerInfo = invokeQueue[i];
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
        };
        MockProvider.MOCK_MODULE_NAME = 'TJangularMocks';
        MockProvider.MOCK_PREFIX = 'TJ__';
        MockProvider.LOGS_ENABLED = false;
        MockProvider.PROMISE_SERVICES = ['$q', '$rootScope', '$timeout', '$interval'];
        MockProvider.MOCKS = [];
        return MockProvider;
    })();
    exports.MockProvider = MockProvider;
    var ProviderDescriptor = (function () {
        function ProviderDescriptor(propertyKey) {
            this.propertyKey = propertyKey;
            this.mocks = {};
            this.mock = false;
            this.attachTemplateToBody = false;
            this.mockControllerDeps = false;
        }
        return ProviderDescriptor;
    })();
    exports.ProviderDescriptor = ProviderDescriptor;
    var MockDescriptor = (function () {
        function MockDescriptor(mock, providerName, providerType) {
            this.mock = mock;
            this.providerName = providerName;
            this.providerType = providerType;
        }
        return MockDescriptor;
    })();
    var TestDescriptor = (function () {
        function TestDescriptor(testname, propertyKey, itMethod) {
            this.testname = testname;
            this.propertyKey = propertyKey;
            this.itMethod = itMethod;
        }
        return TestDescriptor;
    })();
    var MethodDescriptor = (function () {
        function MethodDescriptor(target, propertyKey) {
            this.target = target;
            this.propertyKey = propertyKey;
        }
        return MethodDescriptor;
    })();
    exports.MethodDescriptor = MethodDescriptor;
    function Spec(classname) {
        "use strict";
        return function (target) {
            MockProvider.createSpec(target, classname, describe);
        };
    }
    exports.Spec = Spec;
    function XSpec(classname) {
        "use strict";
        return function (target) {
            MockProvider.createSpec(target, classname, xdescribe);
        };
    }
    exports.XSpec = XSpec;
    function FSpec(classname) {
        "use strict";
        return function (target) {
            MockProvider.createSpec(target, classname, fdescribe);
        };
    }
    exports.FSpec = FSpec;
    function Scope(scope) {
        "use strict";
        return function (target, propertyKey) {
            if (!angular.isDefined(target.$injects)) {
                target.$injects = [];
            }
            var descriptor = undefined;
            angular.forEach(target.$injects, function (desc) {
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
    exports.Scope = Scope;
    function Template(template, attachToBody, mockControllerDeps) {
        "use strict";
        if (attachToBody === void 0) { attachToBody = false; }
        if (mockControllerDeps === void 0) { mockControllerDeps = false; }
        return function (target, propertyKey) {
            if (!angular.isDefined(target.$injects)) {
                target.$injects = [];
            }
            var descriptor = undefined;
            angular.forEach(target.$injects, function (desc) {
                if (desc.propertyKey === propertyKey) {
                    descriptor = desc;
                }
            });
            if (!angular.isDefined(descriptor)) {
                descriptor = new ProviderDescriptor(propertyKey);
            }
            descriptor.attachTemplateToBody = attachToBody;
            descriptor.template = template;
            descriptor.mockControllerDeps = mockControllerDeps;
            target.$injects.push(descriptor);
        };
    }
    exports.Template = Template;
    function Mocks(mocks) {
        "use strict";
        return function (target, propertyKey) {
            if (!angular.isDefined(target.$injects)) {
                target.$injects = [];
            }
            var descriptor = undefined;
            angular.forEach(target.$injects, function (desc) {
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
    exports.Mocks = Mocks;
    function BeforeInject(fn) {
        "use strict";
        return function (target, propertyKey) {
            if (!angular.isDefined(target.$injects)) {
                target.$injects = [];
            }
            var descriptor = undefined;
            angular.forEach(target.$injects, function (desc) {
                if (desc.propertyKey === propertyKey) {
                    descriptor = desc;
                }
            });
            if (!angular.isDefined(descriptor)) {
                descriptor = new ProviderDescriptor(propertyKey);
            }
            descriptor.beforeInject = fn;
            target.$injects.push(descriptor);
        };
    }
    exports.BeforeInject = BeforeInject;
    function Inject(providerName, moduleName, dependencies) {
        "use strict";
        return function (target, propertyKey) {
            if (!angular.isDefined(target.$injects)) {
                target.$injects = [];
            }
            var descriptor = undefined;
            angular.forEach(target.$injects, function (desc) {
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
    exports.Inject = Inject;
    function InjectMock(providerName) {
        "use strict";
        return function (target, propertyKey) {
            if (!angular.isDefined(target.$injects)) {
                target.$injects = [];
            }
            var descriptor = undefined;
            angular.forEach(target.$injects, function (desc) {
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
    exports.InjectMock = InjectMock;
    function Test(name) {
        "use strict";
        return function (target, propertyKey) {
            MockProvider.createTest(target, name, propertyKey, it);
        };
    }
    exports.Test = Test;
    function XTest(name) {
        "use strict";
        return function (target, propertyKey) {
            MockProvider.createTest(target, name, propertyKey, xit);
        };
    }
    exports.XTest = XTest;
    function FTest(name) {
        "use strict";
        return function (target, propertyKey) {
            MockProvider.createTest(target, name, propertyKey, fit);
        };
    }
    exports.FTest = FTest;
    function Before() {
        "use strict";
        return function (target, propertyKey) {
            if (!angular.isDefined(target.$before)) {
                target.$before = [];
            }
            target.$before.push(new MethodDescriptor(target, propertyKey));
        };
    }
    exports.Before = Before;
    function ProvideMock(providerName, providerType) {
        "use strict";
        return function (target) {
            MockProvider.registerMock(target, providerName, providerType);
        };
    }
    exports.ProvideMock = ProvideMock;
    function ProvideMockService(providerName) {
        "use strict";
        return function (target) {
            MockProvider.registerMock(target, providerName, 'service');
        };
    }
    exports.ProvideMockService = ProvideMockService;
    function ProvideMockProvider(providerName) {
        "use strict";
        return function (target) {
            MockProvider.registerMock(target, providerName, 'provider');
        };
    }
    exports.ProvideMockProvider = ProvideMockProvider;
    function ProvideMockController(providerName) {
        "use strict";
        return function (target) {
            MockProvider.registerMock(target, providerName, 'controller');
        };
    }
    exports.ProvideMockController = ProvideMockController;
    function ProvideMockDirective(providerName) {
        "use strict";
        return function (target) {
            MockProvider.registerMock(target, providerName, 'directive');
        };
    }
    exports.ProvideMockDirective = ProvideMockDirective;
    function ProvideMockValue(providerName) {
        "use strict";
        return function (target) {
            MockProvider.registerMock(target, providerName, 'value');
        };
    }
    exports.ProvideMockValue = ProvideMockValue;
    function ProvideMockConstant(providerName) {
        "use strict";
        return function (target) {
            MockProvider.registerMock(target, providerName, 'constant');
        };
    }
    exports.ProvideMockConstant = ProvideMockConstant;
});
