define(["require", "exports", "testutil/tjangular/MockProvider"], function (require, exports, MockProvider_1) {
    function Spec(classname) {
        "use strict";
        return function (target) {
            MockProvider_1.MockProvider.createSpec(target, classname, describe);
        };
    }
    exports.Spec = Spec;
    function XSpec(classname) {
        "use strict";
        return function (target) {
            MockProvider_1.MockProvider.createSpec(target, classname, xdescribe);
        };
    }
    exports.XSpec = XSpec;
    function FSpec(classname) {
        "use strict";
        return function (target) {
            MockProvider_1.MockProvider.createSpec(target, classname, fdescribe);
        };
    }
    exports.FSpec = FSpec;
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
                descriptor = new MockProvider_1.ProviderDescriptor(propertyKey);
            }
            descriptor.mocks = mocks;
            target.$injects.push(descriptor);
        };
    }
    exports.Mocks = Mocks;
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
                descriptor = new MockProvider_1.ProviderDescriptor(propertyKey);
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
                descriptor = new MockProvider_1.ProviderDescriptor(propertyKey);
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
            MockProvider_1.MockProvider.createTest(target, name, propertyKey, it);
        };
    }
    exports.Test = Test;
    function XTest(name) {
        "use strict";
        return function (target, propertyKey) {
            MockProvider_1.MockProvider.createTest(target, name, propertyKey, xit);
        };
    }
    exports.XTest = XTest;
    function FTest(name) {
        "use strict";
        return function (target, propertyKey) {
            MockProvider_1.MockProvider.createTest(target, name, propertyKey, fit);
        };
    }
    exports.FTest = FTest;
    function Before() {
        "use strict";
        return function (target, propertyKey) {
            if (!angular.isDefined(target.$before)) {
                target.$before = [];
            }
            target.$before.push(new MockProvider_1.MethodDescriptor(target, propertyKey));
        };
    }
    exports.Before = Before;
    function ProvideMock(providerName, providerType) {
        "use strict";
        return function (target) {
            MockProvider_1.MockProvider.registerMock(target, providerName, providerType);
        };
    }
    exports.ProvideMock = ProvideMock;
    function ProvideMockService(providerName) {
        "use strict";
        return function (target) {
            MockProvider_1.MockProvider.registerMock(target, providerName, 'service');
        };
    }
    exports.ProvideMockService = ProvideMockService;
    function ProvideMockProvider(providerName) {
        "use strict";
        return function (target) {
            MockProvider_1.MockProvider.registerMock(target, providerName, 'provider');
        };
    }
    exports.ProvideMockProvider = ProvideMockProvider;
    function ProvideMockController(providerName) {
        "use strict";
        return function (target) {
            MockProvider_1.MockProvider.registerMock(target, providerName, 'controller');
        };
    }
    exports.ProvideMockController = ProvideMockController;
    function ProvideMockDirective(providerName) {
        "use strict";
        return function (target) {
            MockProvider_1.MockProvider.registerMock(target, providerName, 'directive');
        };
    }
    exports.ProvideMockDirective = ProvideMockDirective;
    function ProvideMockValue(providerName) {
        "use strict";
        return function (target) {
            MockProvider_1.MockProvider.registerMock(target, providerName, 'value');
        };
    }
    exports.ProvideMockValue = ProvideMockValue;
    function ProvideMockConstant(providerName) {
        "use strict";
        return function (target) {
            MockProvider_1.MockProvider.registerMock(target, providerName, 'constant');
        };
    }
    exports.ProvideMockConstant = ProvideMockConstant;
});
