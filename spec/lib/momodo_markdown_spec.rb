# frozen_string_literal: true

require 'rails_helper'

# momodo: Discord-style text effects
RSpec.describe MomodoMarkdown do
  def format(text)
    TextFormatter.new(text, markdown: true).to_s
  end

  it 'renders bold' do
    expect(format('**bold**')).to include '<strong>bold</strong>'
  end

  it 'renders italic with either delimiter' do
    expect(format('*a* _b_')).to include('<em>a</em>').and include('<em>b</em>')
  end

  it 'renders bold italic' do
    expect(format('***x***')).to include '<strong><em>x</em></strong>'
  end

  it 'renders underline, strikethrough and spoiler' do
    html = format('__u__ ~~s~~ ||sp||')

    expect(html).to include('<u>u</u>')
      .and include('<del>s</del>')
      .and include('<span class="md-spoiler">sp</span>')
  end

  it 'renders nested effects' do
    expect(format('**bold *it* bold**')).to include '<strong>bold <em>it</em> bold</strong>'
  end

  it 'protects inline code from further formatting' do
    expect(format('`a **b**`')).to include '<code>a **b**</code>'
  end

  it 'renders fenced blocks with a language tag and inner newlines' do
    expect(format("```ruby\nputs 1\nputs 2\n```")).to include '<code class="md-codeblock">puts 1<br/>puts 2</code>'
  end

  it 'honours backslash escapes' do
    expect(format('\\*not italic\\*')).to include '*not italic*'
  end

  it 'leaves unmatched delimiters alone' do
    expect(format('2 ** 3 and a * b')).to include '2 ** 3 and a * b'
  end

  it 'does not italicize snake_case words' do
    expect(format('snake_case_word')).to include 'snake_case_word'
  end

  it 'does not span paragraphs' do
    expect(format("**a\n\nb**")).to_not include '<strong>'
  end

  it 'does not touch delimiters inside tag attributes' do
    html = format('**bold** https://example.com/a_b_c after')

    expect(html).to include('<strong>bold</strong>')
      .and include('href="https://example.com/a_b_c"')
  end

  it 'is inert without the markdown option' do
    expect(TextFormatter.new('**bold**').to_s).to_not include '<strong>'
  end

  it 'escapes HTML in the source text as usual' do
    expect(format('**<script>**')).to include '<strong>&lt;script&gt;</strong>'
  end
end
