'use strict';

module.exports = function(grunt) {
    grunt.initConfig({
        watch: {
            test: {
                files: ['src/**/*.js', 'test/**/*.js'],
                tasks: ['test']
            }
        },

        'mocha_istanbul': {
            options: {
                reportFormats: ['html']
            },
            library: {
                src: 'test',
                coverage: true,
                coverageFolder: 'coverage'
            }
        },

        eslint: {
            source: [ 'src/**/*.js' ],
            tests: [ 'test/**/*.js' ]
        }
    })

    grunt.loadNpmTasks('grunt-mocha-istanbul');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-eslint');

    grunt.registerTask('test', ['mocha_istanbul', 'eslint']);
    grunt.registerTask('default', 'watch');
}
