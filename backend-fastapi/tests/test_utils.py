"""Tests for utility functions: slugify, parse_github_url, caching."""

from main import slugify, parse_github_url, _github_cache


class TestSlugify:
    def test_basic_slug(self):
        assert slugify("Hello World") == "hello-world"

    def test_special_characters(self):
        assert slugify("My Cool Post!") == "my-cool-post"

    def test_multiple_spaces(self):
        assert slugify("Hello   World") == "hello-world"

    def test_underscores(self):
        assert slugify("hello_world") == "hello-world"

    def test_leading_trailing_spaces(self):
        assert slugify("  hello  ") == "hello"

    def test_empty_string(self):
        assert slugify("") == ""

    def test_only_special_chars(self):
        result = slugify("!@#$%")
        assert result == ""

    def test_unicode_chars(self):
        result = slugify("Café Résumé")
        assert "caf" in result

    def test_long_title(self):
        long_title = "a" * 200
        result = slugify(long_title)
        assert len(result) <= 200

    def test_consecutive_hyphens(self):
        assert slugify("hello---world") == "hello-world"

    def test_numbers_preserved(self):
        assert slugify("Post 123") == "post-123"


class TestParseGithubUrl:
    def test_valid_url(self):
        owner, repo = parse_github_url("https://github.com/user/repo")
        assert owner == "user"
        assert repo == "repo"

    def test_url_with_trailing_slash(self):
        owner, repo = parse_github_url("https://github.com/user/repo/")
        assert owner == "user"
        assert repo == "repo"

    def test_url_with_extra_path(self):
        owner, repo = parse_github_url("https://github.com/user/repo/tree/main")
        assert owner == "user"
        assert repo == "repo"

    def test_invalid_url_no_repo(self):
        owner, repo = parse_github_url("https://github.com/user")
        assert owner is None
        assert repo is None

    def test_invalid_url_no_owner(self):
        owner, repo = parse_github_url("https://github.com")
        assert owner is None
        assert repo is None

    def test_not_github_url(self):
        owner, repo = parse_github_url("https://gitlab.com/user/repo")
        assert owner == "user"
        assert repo == "repo"  # Still parses correctly

    def test_empty_string(self):
        owner, repo = parse_github_url("")
        assert owner is None
        assert repo is None

    def test_url_with_subdomain(self):
        owner, repo = parse_github_url("https://www.github.com/user/repo")
        assert owner == "user"
        assert repo == "repo"


class TestGithubCache:
    def test_cache_stores_data(self):
        _github_cache["test/repo"] = (1000000, {"data": "test"})
        assert "test/repo" in _github_cache
        # Cleanup
        del _github_cache["test/repo"]

    def test_cache_returns_tuple(self):
        _github_cache["test/repo2"] = (1000000.0, {"data": "test"})
        cached = _github_cache["test/repo2"]
        assert isinstance(cached, tuple)
        assert len(cached) == 2
        assert isinstance(cached[0], float)
        # Cleanup
        del _github_cache["test/repo2"]
