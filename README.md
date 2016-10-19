TJAngular - Easy unit tests with TypeScript, jasmine and angular
----------------------------------------------------------------
TJAngular is a small framework that makes writing unit tests a little less painfull. It depends on TypeScript, angular and Jasmine.

Quickstart
----------
Makes unit testing easier by taking care of setting up the environment for you.
```javascript
"use strict";

import {Spec, Inject, Test, Mocks, Scope} from "TJAngular/index";

@Spec()
class StatementDownloadCtrlSpec {

    @Scope({
        "scopemember":"1234"
    })
    @Mocks({
        "accountId": "ownAccount1",
        "billId": "2016001"
    })
    @Inject("dashboard_statement_download_ctrl", "dashboard")
    private controller : myproj.IStatementDownloadCtrl;

    @Test()
    public testInit() : void {
        expect(this.controller).toBeDefined();
    }
}
```

What does it do?
----------------

Mocking out dependencies in unit tests can be a huge pain. Angular makes testing "easy", but mocking out *every* dependecy isn't so slick. If you've ever written an Angular unit test (using Jasmine/Mocha), you've probably seen a ton of `beforeEach` boilerplate that looks something like this:

```javascript
describe("StatementDownloadCtrl", () => {
    var CTRL_ID : string = "dashboard_statement_download_ctrl";

    var statementDownloadCtrl : myproj.IStatementDownloadCtrl;
    var scope : myproj.IStatementDownloadScope;
    var downloadService : service.IDownloadService;

    beforeEach(angular.mock.module("app"));
    beforeEach(angular.mock.module("common"));
    beforeEach(angular.mock.module("dashboard"));

    beforeEach(() => {
        inject(($controller : any,
                $httpBackend : any,
                ENV : any,
                $rootScope : any,
                $window : any,
                $log : any,
                download_service : service.IDownloadService) => {
            scope = $rootScope.$new();
            $httpBackend.expectGET(ENV.LANGUAGE_SERVICE_URL + "?lang=de").respond(200);
            downloadService = myprojspa_download_service;

            statementDownloadCtrl = $controller(CTRL_ID,
                {
                    $scope: scope,
                    $window: $window,
                    $log: $log,
                    downloadService: downloadService,
                    accountId: 123,
                    billId: "b1"
                });
        });
    });

    it("should be initialized", () => {
        expect(statementDownloadCtrl).toBeDefined();
    });

    it("should call downloadservice with correct default parameters", () => {
        spyOn(downloadService, "getDownloadAccountStatementUrl").and.returnValue("someurl");

        statementDownloadCtrl.onDownload();

        expect(downloadService.getDownloadAccountStatementUrl).toHaveBeenCalledWith(123, "b1", "A4", false);
    });
});
```

In order to test a controller, we have to inject all the dependencies, set up the actual controller and then we can think about
the actual test cases.

What if it was a lot easier? What if we could hearness the power of TypeScript and make writing tests fun?

```javascript
"use strict";

import {Spec, Inject, Test, Mocks, Scope} from "TJAngular/index";

@Spec()
class StatementDownloadCtrlSpec {

    @Scope({
        "scopemember":"1234"
    })
    @Mocks({
        "accountId": "ownAccount1",
        "billId": "2016001"
    })
    @Inject("dashboard_statement_download_ctrl", "dashboard")
    private controller : myproj.IStatementDownloadCtrl;

    @Test()
    public testInit() : void {
        expect(this.controller).toBeDefined();
    }

    @Test("should call downloadservice with correct default parameters")
    public testDownloadServiceCall() : void {
        spyOn((<any> this.controller).$deps.myprojspa_download_service, "getDownloadAccountStatementUrl").and.callThrough();
        this.controller.onDownload();
        expect((<any> this.controller).$deps.myprojspa_download_service.getDownloadAccountStatementUrl).toHaveBeenCalledWith("ownAccount1", "2016001", "A4", false);
    }
}
```

How does it work?
-----------------
TJAngular does all the `beforeEach` boilerplate behind the scenes and just injects the objects that you want to test into your
test class.

How do I use it?
----------------
Instead of writing complicated function `describe` constructs as you have known them from Jasmine, you simply write a
TypeScript class for each Test and annotate it properly.

How do I provide mocks for Services, Providers,...
--------------------------------------------------
TJAngular holds an internal angular module for all the mocks. You can register mocks by simply annotating them.

```javascript
import {ProvideMockService} from "TJAngular";
"use strict";

@ProvideMockService("myprojspa_download_service")
class AnyDownloadService implements service.IDownloadService {

    public getDownloadAccountStatementUrl(account : string, id : string, format : string, sign : boolean) : string {
        return undefined;
    }
}    
```

TJAnuglar will always first look for a mock to inject them into your requested objects. If there is no mock available,
the original injectable will be used.

The TJAngular API
-----------------
As shown in the examples above, TJAngular mostly uses `Decorators` to do all its magic.

###Available Decorators
- `@Spec(classname? : string)` - Use it to annotate your test class. You can provide a name, that will be used for the `describe`. If no name will be provided, the name of the class will be used.
- `@FSpec(classname? : string)` - Same as above, only that an `fdescribe` will be used.
- `@XSpec(classname? : string)` - Same as above, only that an `xdescribe` will be used.
- `@Inject(providerName : string, moduleName : string, dependencies? : Array<string>)` - Use it to annotate a property in your class. TJAngular will then inject the requested object into your class, before the `@Before` methods and the `@Test` methods will be executed. TJAngular will load this dependency from the provided module. Additional modules can be loaded with the `dependencies` array.
- `@Mocks(mocks : any)` - Use it to provide additional objects/values, that need to be resolved by a resource that was requested with the `@Inject` annotation.
- `@Scope(scope : any)` - Use it to provide a scope, that need to be resolved by a resource that was requested with the `@Inject` annotation. Internally it will use $rootScope.$new() to create a new scope and extend it with the scope object provided in the annotation. The scope will be injected as $scope into your injectable.
- `@Template(html : string)` - If you want to test directives/components, you need to inject the directive/component using `@Inject` and provide a template where the directive/component resides.
- `@InjectMock(providerName : string)` - Same as `@Inject`, only that it will load the ressource soely from the internal mock module.
- `@Test(name? : string)` -  Use it to annotate a test method. It will use this method and execute it with jasmine's `it`. You can provide an optional name. If no name will be provided, the method name will be used as test name.
- `@FTest(name? : string)` - Same as `@Test`, only that `fit` will be used.
- `@XTest(name? : string)` - Same as `@Test`, only that `xit` will be used.
- `@Before()` - Use it to annotate a method that should be executed after all properties have been injected and before the test methods will be executed.
- `@ProvideMock(providerName : string, providerType : string)` - Use it to annotate classes that you would like to add to the internal mock module.
- `@ProvideMockService(providerName : string)` - Shorthand for `@ProvideMock(providerName, 'service')`.
- `@ProvideMockController(providerName : string)` - Shorthand for `@ProvideMock(providerName, 'controller')`.
- `@ProvideMockProvider(providerName : string)` - Shorthand for `@ProvideMock(providerName, 'provider')`.
- `@ProvideMockDirective(providerName : string)` - Shorthand for `@ProvideMock(providerName, 'directive')`.
- `@ProvideMockConstant(providerName : string)` - Shorthand for `@ProvideMock(providerName, 'constant')`.
- `@ProvideMockValue(providerName : string)` - Shorthand for `@ProvideMock(providerName, 'value')`.

Using injected properties
-------------------------
Once you have injected a resource into your test class with `@Inject`, you can use it in your test methods.
Every injected resource has additional information attached to it, that you can use to test it.

- `$deps` - All dependencies that have been injected into the requested resource. E.g.
    ```javascript
        spyOn((<any> this.controller).$deps.download_service, "getDownloadAccountStatementUrl")
    ```
