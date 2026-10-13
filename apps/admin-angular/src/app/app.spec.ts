import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App shell', () => {
  it('renders the admin header link', async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const text = (fixture.nativeElement as HTMLElement).querySelector('.app-header a')?.textContent;
    expect(text).toContain('PolyApp admin');
  });
});
