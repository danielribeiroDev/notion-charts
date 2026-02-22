# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

NOTION
OAuth Client ID
304d872b-594c-80d5-9cb2-00370890e694

OAuth Client Secret
secret_60pqusQ5sL0lpu4IqIcvS3mO1in26RkVfLR7cMyF9qs

Authorization URL
https://api.notion.com/v1/oauth/authorize?client_id=304d872b-594c-80d5-9cb2-00370890e694&response_type=code&owner=user&redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Fnotion%2Fcallback

OAuth domains & URIs
Redirect URIs
http://localhost:5173/notion/callback

Continuar com Metrics

Agora, precisamos computar o chart para renderizar os valores das métricas com base no que foi definido pelo usuário em configjson

Precisamos criar um serviço que é capaz de computar as métricas definidas em um chart pelo usuário, ou seja, precisamos utilizar o configJson e notionDatabaseId para recuperar os dados necessários e calcular as métricas. As métricas calculadas devem preencher o chart que fica no dashboard de charts do usuário (preenchendo-o).

To fix:
{
    Conexão com notion: verificar se a conexão é longa e duradoura (não expirar como jwt token - evitar ficar reconectando semrpe)

    Editar chart: ao editar o chart, o char atual não é mostrado com as propriedades atuais, ao invés disso vem default - deve vir com as configurações atuais setadas
}

I want the Notion connection to persist for as long as possible to avoid short, repetitive reconnections. Currently, after a period of time—at least on the frontend—the connection becomes invalid, which prevents me from selecting a Notion database when trying to create a chart. we need to show the 'Connect' button in each workspace, not before it. Red if it is not already conected, and green otherwise (but with recconection option). 

We need to check when rendering workspaces if the notion connection is true/valid (backend response). If not, show "connect to notion" button, if yes show a green notion connected button (user can reconect with notion if want pressing this button). I saw in notionConnection: botId is being stored in localstorage, if it is sensitive information, it must be replaced or remove.