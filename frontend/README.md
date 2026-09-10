# Frontend

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.0.7.

## Running the Angular CLI

The `ng` commands below assume you are in `frontend/`. From the repository root, use the
`npm run ng` script instead — it forwards to the Angular CLI in this workspace. Arguments have
to be passed after `--`, otherwise npm swallows them.

| In `frontend/`                 | From the repository root                  |
| ------------------------------ | ----------------------------------------- |
| `ng serve`                     | `npm run ng -- serve`                     |
| `ng build`                     | `npm run ng -- build`                     |
| `ng test`                      | `npm run ng -- test`                      |
| `ng generate component <name>` | `npm run ng -- generate component <name>` |

## Project structure

```text
src/app/
├── pages/        # smart components, one per route
├── components/   # dumb building blocks
├── services/     # API communication
└── models/       # types of the API data
```

**Pages** are the smart components. They hold the logic and state, talk to the API through
services, and pass data down into components.

**Components** are the building blocks and stay dumb. Data comes in via `input()`, user actions
go back out via `output()`, and the page handles them. That keeps a component reusable — one
that injects a service is tied to a single data source.

**Services** handle the communication and mirror the backend: every router gets its own service,
e.g. `AuthApiService` for `/api/auth/*`. If a response has to be reshaped for the UI, that
happens here.

**Models** hold the types of the data sent to and received from the API. `interface` for object
shapes, `type` for unions (e.g. `type TransactionType = "buy" | "sell"`).

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
