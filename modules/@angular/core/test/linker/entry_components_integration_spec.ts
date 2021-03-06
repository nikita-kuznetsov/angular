/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {ANALYZE_FOR_ENTRY_COMPONENTS, Component, ComponentFactoryResolver, NoComponentFactoryError, forwardRef} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {Console} from '../../src/console';


export function main() {
  describe('jit', () => { declareTests({useJit: true}); });
  describe('no jit', () => { declareTests({useJit: false}); });
}

class DummyConsole implements Console {
  public warnings: string[] = [];

  log(message: string) {}
  warn(message: string) { this.warnings.push(message); }
}

function declareTests({useJit}: {useJit: boolean}) {
  describe('@Component.entryComponents', function() {
    var console: DummyConsole;
    beforeEach(() => {
      console = new DummyConsole();
      TestBed.configureCompiler(
          {useJit: useJit, providers: [{provide: Console, useValue: console}]});
      TestBed.configureTestingModule({declarations: [MainComp, ChildComp, NestedChildComp]});
      TestBed.compileComponents();
    });

    it('should resolve ComponentFactories from the same component', () => {
      const compFixture = TestBed.createComponent(MainComp);
      let mainComp: MainComp = compFixture.componentInstance;
      expect(compFixture.componentRef.injector.get(ComponentFactoryResolver)).toBe(mainComp.cfr);
      var cf = mainComp.cfr.resolveComponentFactory(ChildComp);
      expect(cf.componentType).toBe(ChildComp);
    });

    it('should resolve ComponentFactories via ANALYZE_FOR_ENTRY_COMPONENTS', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule(
          {declarations: [CompWithAnalyzeEntryComponentsProvider, NestedChildComp, ChildComp]});
      let compFixture = TestBed.createComponent(CompWithAnalyzeEntryComponentsProvider);
      let mainComp: CompWithAnalyzeEntryComponentsProvider = compFixture.componentInstance;
      let cfr: ComponentFactoryResolver =
          compFixture.componentRef.injector.get(ComponentFactoryResolver);
      expect(cfr.resolveComponentFactory(ChildComp).componentType).toBe(ChildComp);
      expect(cfr.resolveComponentFactory(NestedChildComp).componentType).toBe(NestedChildComp);
    });

    it('should be able to get a component form a parent component (view hiearchy)', () => {
      TestBed.overrideComponent(MainComp, {set: {template: '<child></child>'}});

      const compFixture = TestBed.createComponent(MainComp);
      let childCompEl = compFixture.debugElement.children[0];
      let childComp: ChildComp = childCompEl.componentInstance;
      // declared on ChildComp directly
      expect(childComp.cfr.resolveComponentFactory(NestedChildComp).componentType)
          .toBe(NestedChildComp);
      // inherited from MainComp
      expect(childComp.cfr.resolveComponentFactory(ChildComp).componentType).toBe(ChildComp);
    });

    it('should not be able to get components from a parent component (content hierarchy)', () => {
      TestBed.overrideComponent(MainComp, {set: {template: '<child><nested></nested></child>'}});
      TestBed.overrideComponent(ChildComp, {set: {template: '<ng-content></ng-content>'}});

      const compFixture = TestBed.createComponent(MainComp);
      let nestedChildCompEl = compFixture.debugElement.children[0].children[0];
      let nestedChildComp: NestedChildComp = nestedChildCompEl.componentInstance;
      expect(nestedChildComp.cfr.resolveComponentFactory(ChildComp).componentType).toBe(ChildComp);
      expect(() => nestedChildComp.cfr.resolveComponentFactory(NestedChildComp))
          .toThrow(new NoComponentFactoryError(NestedChildComp));
    });

  });
}

@Component({selector: 'nested', template: ''})
class NestedChildComp {
  constructor(public cfr: ComponentFactoryResolver) {}
}

@Component({selector: 'child', entryComponents: [NestedChildComp], template: ''})
class ChildComp {
  constructor(public cfr: ComponentFactoryResolver) {}
}

@Component({
  selector: 'main',
  entryComponents: [ChildComp],
  template: '',
})
class MainComp {
  constructor(public cfr: ComponentFactoryResolver) {}
}

@Component({
  selector: 'comp-with-analyze',
  template: '',
  providers: [{
    provide: ANALYZE_FOR_ENTRY_COMPONENTS,
    multi: true,
    useValue: [
      {a: 'b', component: ChildComp},
      {b: 'c', anotherComponent: NestedChildComp},
    ]
  }]
})
class CompWithAnalyzeEntryComponentsProvider {
}
