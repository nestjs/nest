const fs = require('fs');
const path = require('path');
const gulp = require('gulp');
const ts = require('gulp-typescript');
const sourcemaps = require('gulp-sourcemaps');
const clean = require('gulp-clean');
const deleteEmpty = require('delete-empty');

const packages = {
  common: ts.createProject('packages/common/tsconfig.json'),
  core: ts.createProject('packages/core/tsconfig.json'),
  microservices: ts.createProject('packages/microservices/tsconfig.json'),
  websockets: ts.createProject('packages/websockets/tsconfig.json'),
  testing: ts.createProject('packages/testing/tsconfig.json'),
  'platform-express': ts.createProject(
    'packages/platform-express/tsconfig.json',
  ),
  'platform-fastify': ts.createProject(
    'packages/platform-fastify/tsconfig.json',
  ),
  'platform-socket.io': ts.createProject(
    'packages/platform-socket.io/tsconfig.json',
  ),
  'platform-ws': ts.createProject('packages/platform-ws/tsconfig.json'),
};
const modules = Object.keys(packages);
const source = 'packages';
const distId = process.argv.indexOf('--dist');
const dist = distId < 0 ? source : process.argv[distId + 1];

gulp.task('default', function() {
  modules.forEach(module => {
    gulp.watch(
      [`${source}/${module}/**/*.ts`, `${source}/${module}/*.ts`],
      [module],
    );
  });
});

gulp.task('copy-misc', function() {
  return gulp
    .src(['Readme.md', 'LICENSE', '.npmignore'])
    .pipe(gulp.dest(`${source}/common`))
    .pipe(gulp.dest(`${source}/core`))
    .pipe(gulp.dest(`${source}/microservices`))
    .pipe(gulp.dest(`${source}/websockets`))
    .pipe(gulp.dest(`${source}/testing`))
    .pipe(gulp.dest(`${source}/platform-fastify`))
    .pipe(gulp.dest(`${source}/platform-express`))
    .pipe(gulp.dest(`${source}/platform-ws`))
    .pipe(gulp.dest(`${source}/platform-socket.io`));
});

gulp.task('clean:output', function() {
  return gulp
    .src([`${source}/**/*.js`, `${source}/**/*.d.ts`], {
      read: false,
    })
    .pipe(clean());
});

gulp.task('clean:dirs', function(done) {
  deleteEmpty.sync(`${source}/`);
  done();
});

gulp.task('clean:bundle', gulp.series('clean:output', 'clean:dirs'));

modules.forEach(module => {
  gulp.task(module, () => {
    return packages[module]
      .src()
      .pipe(packages[module]())
      .pipe(gulp.dest(`${dist}/${module}`));
  });
});

modules.forEach(module => {
  gulp.task(module + ':dev', () => {
    return packages[module]
      .src()
      .pipe(sourcemaps.init())
      .pipe(packages[module]())
      .pipe(
        sourcemaps.mapSources(sourcePath => './' + sourcePath.split('/').pop()),
      )
      .pipe(sourcemaps.write('.'))
      .pipe(gulp.dest(`${dist}/${module}`));
  });
});

gulp.task('common:dev', gulp.series(modules.map(module => module + ':dev')));
gulp.task('build', gulp.series(modules));
gulp.task('build:dev', gulp.series('common:dev'));

function getFolders(dir) {
  return fs.readdirSync(dir).filter(function(file) {
    return fs.statSync(path.join(dir, file)).isDirectory();
  });
}
gulp.task('move', function() {
  const getDirs = base => getFolders(base).map(path => `${base}/${path}`);

  const examplesDirs = getDirs('sample');
  const integrationDirs = getDirs('integration');
  const directories = examplesDirs.concat(integrationDirs);

  let stream = gulp.src(['node_modules/@nestjs/**/*']);

  directories.forEach(dir => {
    stream = stream.pipe(gulp.dest(dir + '/node_modules/@nestjs'));
  });
  return stream;
});
