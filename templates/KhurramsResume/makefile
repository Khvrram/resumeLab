build:
	pdflatex KhurramResume.tex

setup:
	@echo "Setting up LaTeX environment for resume compilation..."
	@echo "Installing required LaTeX packages..."
	sudo apt update
	sudo apt install -y texlive-full
	@echo "Updating TeX Live package manager..."
	sudo tlmgr update --self
	@echo "Installing additional packages if needed..."
	sudo tlmgr install fontawesome5 hyperref fancyhdr titlesec enumitem multicol tabularx
	@echo "Updating font maps..."
	sudo texhash
	@echo "Setup complete! You can now run 'make build' to compile your resume."

init: setup

.PHONY: build setup init
