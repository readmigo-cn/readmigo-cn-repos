// List.test.ets
// Hypium suite aggregator. DevEco picks up `testsuite()` and runs every suite
// imported here. Add new `*.test.ets` files alongside this entry.

import exampleAbilityTest from './ExampleAbility.test';
import loginPageTest from './Login.test';
import readerPageTest from './Reader.test';

export default function testsuite() {
  exampleAbilityTest();
  loginPageTest();
  readerPageTest();
}
