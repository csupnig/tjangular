define(["require", "exports"], function (require, exports) {
    var MockProvider = (function () {
        function MockProvider() {
        }
        MockProvider.getTestObject = function (descriptor, moduledependencies, unmockeddeps) {
            var allModules = ['ngMock', MockProvider.MOCK_MODULE_NAME].concat(moduledependencies);
            var injector = angular.injector(allModules);
            var moduleObject = angular.module(descriptor.moduleName ? descriptor.moduleName : MockProvider.MOCK_MODULE_NAME);
            var invokeQueue = moduleObject._invokeQueue;
            var providerType = MockProvider.getProviderType(descriptor.providerName, invokeQueue);
            var preparedDeps = {};
            if (angular.isDefined(descriptor.dependencies)) {
                allModules = allModules.concat(descriptor.dependencies);
            }
            angular.forEach(allModules || [], function (moduleName) {
                invokeQueue = invokeQueue.concat(angular.module(moduleName)._invokeQueue);
            });
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
                            preparedDeps[depName] = MockProvider.getMockForProvider(injector, depName, descriptor, unmockeddeps, currProviderDeps, i);
                        }
                    }
                }
            });
            var provider = MockProvider.initializeProvider(injector, providerType, descriptor, preparedDeps);
            angular.forEach(invokeQueue, function (providerData) {
                MockProvider.sanitizeProvider(providerData, injector);
            });
            provider.$deps = preparedDeps;
            return provider;
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
                    angular.forEach(instance.$injects, function (descriptor) {
                        instance[descriptor.propertyKey] = MockProvider.getTestObject(descriptor, instance.$moduledependencies, unmocked);
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
        MockProvider.initializeProvider = function (injector, providerType, descriptor, preparedDeps) {
            var providerName = descriptor.providerName;
            if (descriptor.mock) {
                providerName = MockProvider.MOCK_PREFIX + providerName;
            }
            switch (providerType) {
                case 'controller':
                    var $controller = injector.get('$controller');
                    return $controller(providerName, preparedDeps);
                default:
                    return injector.get(providerName);
            }
        };
        MockProvider.getMockForProvider = function (injector, dependencyName, descriptor, unmockeddeps, currProviderDeps, i) {
            if (angular.isDefined(descriptor.mocks[dependencyName])) {
                MockProvider.log('Found provided mock: ' + dependencyName);
                return descriptor.mocks[dependencyName];
            }
            else {
                if (unmockeddeps.indexOf(dependencyName) < 0 && injector.has(MockProvider.MOCK_PREFIX + dependencyName)) {
                    MockProvider.log('Found mock in mock module: ' + dependencyName);
                    currProviderDeps[i] = MockProvider.MOCK_PREFIX + dependencyName;
                    return injector.get(MockProvider.MOCK_PREFIX + dependencyName);
                }
                else {
                    MockProvider.log('Using unmocked for: ' + dependencyName);
                    return injector.get(dependencyName);
                }
            }
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
        MockProvider.MOCKS = [];
        return MockProvider;
    })();
    exports.MockProvider = MockProvider;
    var ProviderDescriptor = (function () {
        function ProviderDescriptor(propertyKey) {
            this.propertyKey = propertyKey;
            this.mocks = {};
            this.mock = false;
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
});
