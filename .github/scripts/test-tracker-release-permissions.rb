#!/usr/bin/env ruby
# Regression guard: only the release publisher may mutate repository releases.
require 'yaml'

workflow_path = File.expand_path('../workflows/tracker-unified-release.yml', __dir__)
workflow = YAML.safe_load_file(workflow_path, aliases: true)
top_level = workflow.fetch('permissions')
abort 'Expected workflow-wide contents: read permission.' unless top_level == { 'contents' => 'read' }

jobs = workflow.fetch('jobs')
abort 'Missing release publisher job.' unless jobs.key?('publish')

jobs.each do |name, job|
  expected = name == 'publish' ? { 'contents' => 'write' } : { 'contents' => 'read' }
  effective = job.fetch('permissions', top_level)
  abort "Unexpected contents permission for #{name}: #{effective.inspect}" unless effective == expected
end

puts "PASS: #{jobs.length} tracker release jobs use contents: read; publish alone uses contents: write."
