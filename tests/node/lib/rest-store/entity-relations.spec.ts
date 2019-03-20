import { Mock, Times } from 'typemoq';
import { describe, expect, it, wait } from '../../suite';
import RestStore from '../../../../src/lib/rest-store';
import HttpRestClient, { RestResponse } from '../../../../src/lib/http-rest-client';

describe('RestStore', () => {
  describe('entity relations', () => {
    interface Author {
      id: number;
      name: string;
    }

    interface Post {
      id: number;
      author: Author;
    }

    interface Book {
      id: number;
      authors: Author[];
    }

    const postResponse: RestResponse<Post> = {
      data: {
        __links: [{ rel: 'author', href: ':author-api:' }],
        id: 1,
        author: 1
      }
    };

    const bookResponse: RestResponse<Book> = {
      data: {
        __links: [{ rel: 'authors', href: ':author-api:' }],
        id: 1,
        authors: [1]
      }
    };

    const authorsResponse: RestResponse<Author[]> = {
      data: [{
        __links: [],
        id: 1,
        name: 'author 1'
      }]
    };

    const authorResponse: RestResponse<Author> = {
      data: {
        __links: [],
        id: 1,
        name: 'author 1'
      }
    };

    it('should leave primitives alone', async () => {
      const restClient = Mock.ofType<HttpRestClient>();

      restClient
        .setup(x => x.get<Author>(':author-api:'))
        .returns(() => Promise.resolve(authorResponse))
        .verifiable();

      const authorStore = new RestStore<Author>(':author-api:', restClient.object);

      await new Promise(resolve => authorStore.subscribe(resolve));

      expect(authorStore.state.response).to.deep.equal({ id: 1, name: 'author 1' });
    });

    it('should transform a to many relation into a collection store', async () => {
      const restClient = Mock.ofType<HttpRestClient>();

      restClient
        .setup(x => x.get<Book>(':book-api:'))
        .returns(() => Promise.resolve(bookResponse))
        .verifiable();

      restClient
        .setup(x => x.get<Author[]>(':author-api:'))
        .returns(() => Promise.resolve(authorsResponse))
        .verifiable();

      const bookStore = new RestStore<Book>(':book-api:', restClient.object);

      await new Promise(resolve => bookStore.subscribe(resolve));

      // @ts-ignore
      const authorsStore = bookStore.state.response.authors;

      expect(
        authorsStore,
        'The relation was not transformed'
      ).to.not.deep.equal([1]);

      expect(authorsStore.state.response).to.deep.equal([{ id: 1, name: 'author 1' }]);
    });

    it('should transform a to single relation into an entity store', async () => {
      const restClient = Mock.ofType<HttpRestClient>();

      restClient
        .setup(x => x.get<Post>(':post-api:'))
        .returns(() => Promise.resolve(postResponse))
        .verifiable();

      restClient
        .setup(x => x.get<Author>(':author-api:'))
        .returns(() => Promise.resolve(authorResponse))
        .verifiable();

      const postStore = new RestStore<Post>(':post-api:', restClient.object);

      await new Promise(resolve => postStore.subscribe(resolve));

      // @ts-ignore
      const authorStore = postStore.state.response.author;

      expect(
        authorStore,
        'The relation was not transformed'
      ).to.not.deep.equal(1);

      expect(authorStore.state.response).to.deep.equal({ id: 1, name: 'author 1' });
    });

    it('should wait for all child stores', async () => {
      const restClient = Mock.ofType<HttpRestClient>();

      restClient
        .setup(x => x.get<Post>(':post-api:'))
        .returns(() => Promise.resolve(postResponse))
        .verifiable();

      let resolveAuthor: (r: RestResponse<Author>) => void = () => {};

      restClient
        .setup(x => x.get<Author>(':author-api:'))
        .returns(() => new Promise(resolve => { resolveAuthor = resolve; }))
        .verifiable();

      const postStore = new RestStore<Post>(':post-api:', restClient.object);

      // Wait until the post response is fetched.
      await wait(() => restClient.verify(x => x.get(':post-api:'), Times.once()));

      expect(postStore.state.loading).to.be.true;

      const r = new Promise(resolve => {
        postStore.subscribe(state => {
          if (!state.loading) {
            // @ts-ignore
            const authorStore = state.response.author;

            expect(authorStore.state.loading).to.be.false;
            resolve();
          }
        });
      });

      resolveAuthor(authorResponse);

      return r;
    });
  });
});