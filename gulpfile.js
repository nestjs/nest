const fs = require('fs');
const path = require('path');
const gulp = require('gulp');
const ts = require('gulp-typescript');
const sourcemaps = require('gulp-sourcemaps');
const clean = require('gulp-clean');

const packages = {
  common: ts.createProject('packages/common/tsconfig.json'),
  core: ts.createProject('packages/core/tsconfig.json'),
  microservices: ts.createProject('packages/microservices/tsconfig.json'),
  websockets: ts.createProject('packages/websockets/tsconfig.json'),
  testing: ts.createProject('packages/testing/tsconfig.json'),
};
const modules = Object.keys(packages);
const source = 'packages';
const distId = process.argv.indexOf('--dist');
const dist = distId < 0 ? 'node_modules/@nestjs' : process.argv[distId + 1];

gulp.task('default', function() {
  modules.forEach(module => {
    gulp.watch(
      [`${source}/${module}/**/*.ts`, `${source}/${module}/*.ts`],
      [module],
    );
  });
});

gulp.task('copy-docs', function() {
  return gulp
    .src('Readme.md')
    .pipe(gulp.dest('packages/common'))
    .pipe(gulp.dest('packages/core'))
    .pipe(gulp.dest('packages/microservices'))
    .pipe(gulp.dest('packages/websockets'))
    .pipe(gulp.dest('packages/testing'));
});

gulp.task('clean:bundle', function() {
  return gulp
    .src(['packages/**/*.js.map'], {
      read: false,
    })
    .pipe(clean());
});

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

gulp.task('common', gulp.series(modules));

gulp.task('common:dev', gulp.series(modules.map(module => module + ':dev')));

gulp.task('build', gulp.series('common'));

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
