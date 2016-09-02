import {ProviderDescriptor, MockProvider, MethodDescriptor} from "testutil/tjangular/MockProvider";

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
