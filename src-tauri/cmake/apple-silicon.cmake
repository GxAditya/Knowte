# Apple Silicon (aarch64-apple-darwin) cmake toolchain override.
#
# GitHub Actions Apple Silicon runners don't support ARM i8mm at runtime.
# ggml's CMakeLists enables MATMUL_INT8 via a compile-time probe (which
# succeeds because the toolchain *can* emit i8mm code) yet simultaneously
# compiles with -mcpu flags that exclude i8mm. The resulting mismatch causes
# the always_inline 'vmmlaq_s32' build error.
#
# Disabling GGML_NATIVE suppresses the native CPU feature probe entirely,
# so ggml won't generate conflicting -mcpu+noi8mm flags or enable MATMUL_INT8.

set(GGML_NATIVE OFF CACHE BOOL "Disable native CPU detection for CI builds" FORCE)
