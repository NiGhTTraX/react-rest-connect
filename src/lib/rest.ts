import { StateContainer } from 'react-connect-state';
import { Omit } from 'react-bind-component';

export type PatchPayload<T extends { id: any }> = Pick<T, 'id'> & Partial<Omit<T, 'id'>>;

export interface RestCollectionState<T> {
  loading: boolean;
  response: T[]
}

// eslint-disable-next-line max-len
export interface IRestCollectionStore<T extends { id: any }> extends StateContainer<RestCollectionState<T>> {
  state: RestCollectionState<T>;

  /**
   * Create a new entity via a POST request.
   */
  post: (payload: Partial<Omit<T, 'id'>>) => Promise<T>;

  /**
   * Update an existing entity via a POST request.
   */
  patch: (payload: PatchPayload<T>) => Promise<T>;
}
