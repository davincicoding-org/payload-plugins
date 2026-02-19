export default function plopConfig(plop) {
  plop.setGenerator('plugin', {
    description: 'Scaffold a new Payload plugin',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Plugin name (kebab-case, without "payload-" prefix):',
        validate: (value) => {
          if (!value) return 'Name is required';
          if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(value))
            return 'Must be kebab-case (e.g. "my-plugin")';
          return true;
        },
      },
      {
        type: 'input',
        name: 'description',
        message: 'Short description:',
        validate: (value) => (value ? true : 'Description is required'),
      },
    ],
    actions: [
      // Generate the plugin files
      {
        type: 'addMany',
        destination: 'plugins/{{name}}/',
        base: 'plop-templates/plugin/',
        templateFiles: 'plop-templates/plugin/**/*.hbs',
        stripExtensions: ['hbs'],
      },
      // Add the new scope to the commitlint rules
      {
        type: 'modify',
        path: 'package.json',
        transform: (content, data) => {
          const pkg = JSON.parse(content);
          const scopes = pkg.commitlint.rules['scope-enum'][2];
          const newScope = `payload-${data.name}`;
          if (!scopes.includes(newScope)) {
            scopes.push(newScope);
            scopes.sort();
          }
          return JSON.stringify(pkg, null, 2) + '\n';
        },
      },
    ],
  });
}
