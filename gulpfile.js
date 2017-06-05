const gulp = require('gulp');
const ts = require('gulp-typescript');

const packages = {
    common: ts.createProject('src/common/tsconfig.json'),
    core: ts.createProject('src/core/tsconfig.json'),
    microservices: ts.createProject('src/microservices/tsconfig.json'),
    websockets: ts.createProject('src/websockets/tsconfig.json'),
    testing: ts.createProject('src/testing/tsconfig.json')
};
const modules = Object.keys(packages);
const source = 'src';
const dist = 'node_modules/@nestjs'

gulp.task('default', function () {
    modules.forEach((module) => {
        gulp.watch([`${source}/${module}/**/*.ts`, `${source}/${module}/*.ts`], [module]);
    });
});

modules.forEach((module) => {
    gulp.task(module, () => {
        return packages[module].src()
            .pipe(packages[module]())
            .pipe(gulp.dest(`${dist}/${module}`));
    });
});

