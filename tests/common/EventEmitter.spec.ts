import { expect } from "chai";
import EventEmitter from "common/EventEmitter";

enum TestEventType {
  VOID_EVENT,
  NUMBER_EVENT,
  THIRD_EVENT,
};

interface TestEventConfiguration {
  [TestEventType.VOID_EVENT]: { (): void },
  [TestEventType.NUMBER_EVENT]: { (value: number): void }
};

class TestClass extends EventEmitter<TestEventConfiguration> {
  voidAction() { this.fire(TestEventType.VOID_EVENT); }
  numberAction() { this.fire(TestEventType.NUMBER_EVENT, 42); }
}

describe("#strategy", () => {

  it("should emit event", () => {
    const classInstance = new TestClass();
    
    let eventFired = false;

    classInstance.on(TestEventType.VOID_EVENT, () => eventFired = true);

    classInstance.voidAction();
    
    expect(eventFired).to.be.true;
  });

  it("should emit event multiple times", () => {
    const classInstance = new TestClass();
    
    let eventsFired = 0;

    classInstance.on(TestEventType.VOID_EVENT, () => eventsFired++);

    classInstance.voidAction();
    classInstance.voidAction();
    classInstance.voidAction();
    
    expect(eventsFired).to.be.eq(3);
  });

  it("should emit event with options", () => {
    const classInstance = new TestClass();

    let eventFired = false;
    let receivedValue = -1;

    classInstance.on(TestEventType.NUMBER_EVENT, (value: number) => {
      eventFired = true;
      receivedValue = value;
    });

    classInstance.numberAction();
    
    expect(eventFired).to.be.true;
    expect(receivedValue).to.be.eq(42);
  });

  it("should listen to only first event", () => {
    const classInstance = new TestClass();
    
    let eventsFired = 0;

    classInstance.once(TestEventType.VOID_EVENT, () => eventsFired++);

    classInstance.voidAction();
    classInstance.voidAction();
    classInstance.voidAction();
    
    expect(eventsFired).to.be.eq(1);
  });

  it("should listen to multiple events", () => {
    const classInstance = new TestClass();
    
    let eventsFired = 0;

    classInstance.on([ TestEventType.VOID_EVENT, TestEventType.NUMBER_EVENT ], () => eventsFired++);

    classInstance.voidAction();
    classInstance.numberAction();
    
    expect(eventsFired).to.be.eq(2);
  });

});