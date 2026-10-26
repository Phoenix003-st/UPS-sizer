// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import i18n from '../../i18n';
import { useProjectStore } from '../../state/projectStore';
import { App } from '../App';

beforeAll(async () => {
  await i18n.changeLanguage('fr');
  // jsdom ne gère pas <dialog>.showModal
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false;
  };
  window.scrollTo = () => {};
});
afterEach(() => {
  cleanup();
  window.location.hash = '';
  useProjectStore.setState({ projects: {}, currentId: null });
});

async function hashChange() {
  await act(async () => {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
}

describe('parcours utilisateur', () => {
  it('accueil → puissance → local → solutions → livrables', async () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Que voulez-vous protéger ?' }),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Serveurs/ }));
    await hashChange();
    expect(screen.getByRole('heading', { level: 1, name: 'Puissance et autonomie' })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Progression' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Continuer/ }));
    await hashChange();
    expect(screen.getByRole('heading', { level: 1, name: "Local d'installation" })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Continuer/ }));
    await hashChange();
    expect(screen.getByRole('heading', { level: 1, name: 'Solutions proposées' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Recommandée' })).toBeTruthy();

    fireEvent.click(
      screen.getAllByRole('button', { name: /Choisir cette option|Option choisie/ })[0]!,
    );
    await hashChange();
    expect(screen.getByRole('heading', { level: 1, name: 'Livrables' })).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Nomenclature' }));
    expect(screen.getByRole('table', { name: 'Nomenclature' })).toBeTruthy();
    expect(screen.getAllByText(/Pré-dimensionnement indicatif/).length).toBeGreaterThan(0);
  });

  it('les écrans Paramètres, Catalogues et Mes projets s’ouvrent', async () => {
    render(<App />);
    for (const [name, title] of [
      ['Paramètres', 'Paramètres et hypothèses'],
      ['Catalogues', 'Catalogues'],
      ['Mes projets', 'Mes projets'],
    ]) {
      fireEvent.click(screen.getAllByRole('button', { name: name! })[0]!);
      await hashChange();
      expect(screen.getByRole('heading', { level: 1, name: title })).toBeTruthy();
    }
  });
});
